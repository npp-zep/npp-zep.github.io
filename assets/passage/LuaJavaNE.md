# LuaJavaNE - Lua 与 Java 的互调引擎

> 本文档对应 LuaJavaNE v2.4.1。完整 API 文档见 `docs/` 目录：
> [APIs.md](docs/APIs.md) · [AgentV2.md](docs/AgentV2.md) · [Java4Lua.md](docs/Java4Lua.md) · [Lua4Java.md](docs/Lua4Java.md)

---

## 项目灵感

当时我还在用 Lua 5.3 的 LuaJava 项目来开发一些东西。
但是我在网上查关于 Lua 的资料时，几乎全是 Lua 5.4 甚至 5.5 的信息。
我这个 Lua 5.3 当然不支持那些新现代特性了，所以我寻思着反正我也没啥事，就做了这个项目。
（故此更新有点随缘）

LuaJavaNE 是 **Lua 5.4.8 + Java 双向互调引擎**：

- 在 Lua 里直接调用 Java 类库、对象、数组；
- 在 Java 里执行 Lua 脚本、调用 Lua 函数；
- 支持异步多线程（轮询 / 回调 / 协程等待）、动态代理、高性能批量数学运算；
- Lua 源码保持原样，升级 Lua 仅需替换目录。

---

## 下载方式

### Git 下载源码

~~~bash
git clone https://github.com/npp-zep/LuaJavaNE.git
~~~

### Release 下载

- 打开 **https://github.com/npp-zep/LuaJavaNE**
- 下滑页面，访问 **Release**
- 下载所需平台对应的压缩包，例如 `luajavane-v2.4.1-Linux-arm64.tar.gz`

---

## 项目环境要求

### 从源码编译

- JDK 17+
- CMake 3.14+
- GCC / Clang
- pthread
- 可选：Ninja
- 可选依赖：
  - OpenMP：`clac` 批量运算多线程（缺失时自动回退单线程）
  - Sleef：`clac` 批量数学 AVX2 向量内核（缺失时自动回退标量）

### 从 Release 使用

- OpenJDK / JRE 17+（如果需要自己写 Java class，则需要 JDK）

---

## 编译方式

确保 JDK >= 17，并满足源码编译环境要求。在项目根目录执行：

~~~bash
make          # 标准构建（C + Java）
make ninja    # 使用 Ninja 加速 C 编译
make test     # 运行 JUnit 测试
~~~

构建完成后启动 REPL：

~~~bash
./luaj.sh
~~~

---

## 升级 Lua 版本

本项目 Lua 源码完全保持原样，不进行任何修改。升级到新版本只需两步：

1. 删除旧版本目录：

~~~bash
rm -rf lua/lua-5.4.8
~~~

2. 下载新版本并解压到 `lua/` 目录：

~~~bash
wget https://lua.org/ftp/lua-5.5.0.tar.gz
tar xzf lua-5.5.0.tar.gz -C lua/
~~~

构建系统会自动识别 `lua/lua-*` 目录，无需改动代码或配置。

---

## 项目结构

~~~
LuaJavaNE/
├── lua/                      # Lua 官方源码（解压即用，无需修改）
│   └── lua-5.4.8/
├── native/                   # C 代码
│   ├── jni/                  # JNI 桥接
│   └── lualib/               # 自定义 Lua 库（java / clac / async / utils / gc）
├── java/src/com/luajava/     # Java 源码
├── test/                     # JUnit 测试
├── lib/                      # 第三方 jar
├── docs/                     # 文档
├── examples/                 # 示例脚本
├── CMakeLists.txt            # C 构建配置
├── Makefile                  # 主构建文件
└── luaj.sh                   # 启动脚本
~~~

---

## 作为库使用

### Java 调用 Lua

~~~java
LuaRuntime L = new LuaRuntime();
L.doString("function add(a, b) return a + b end");
Object result = L.callFunction("add", 3, 5); // 8

LuaFunctionObj fn = L.compile("return function(x) return x * 2 end");
LuaFunctionObj doubler = (LuaFunctionObj) fn.call();
doubler.call(21); // 42
fn.destroy();
doubler.destroy();
L.close();
~~~

### Lua 调用 Java

~~~lua
local java = require("java")
local String = java.import("java.lang.String")
local s = String:new("Hello World")
print(s:length())          -- 11
print(s:substring(0, 5))   -- Hello
~~~

### 注解绑定

~~~java
@LuaModule("math")
class MyMath {
    @LuaFunction public int add(int a, int b) { return a + b; }
    @LuaFunction("multiply") public int mul(int a, int b) { return a * b; }
}
~~~

~~~java
LuaRuntime L = new LuaRuntime();
L.registerModule(new MyMath());
L.doString("print(math_add(3, 5))");       -- 8
L.doString("print(math_multiply(6, 7))");  -- 42
~~~

### 动态代理

用 Lua 表实现 Java 接口：

~~~lua
local handler = { run = function(self) print("Hello from Lua!") end }
local proxy = java.createProxy({"java.lang.Runnable"}, handler)
java.import("java.lang.Thread"):new(proxy):start()

-- 注意：不要在持有 Lua 锁期间调用 t:join()。
-- 后台线程执行 run() 回调也需要 Lua 锁，持锁等待会死锁。
-- 等待代理回调时使用 java.yield(ms) 短暂释放 Lua 锁。
~~~

---

## Agent V2 异步 API（多线程）

Agent V2 提供基于 **Promise** 的异步任务系统。所有任务在后台线程池中运行，结果通过 Promise 机制返回主线程。

主要特性：

- 非阻塞执行：静态方法、实例方法、构造器均可异步调用；
- 多返回值：`java.promise(true)` 可把 `Object[]` 展开为多个 Lua 值；
- 错误隔离：任务异常转为错误字符串，不会导致进程崩溃；
- 对象池管理：Java 对象/数组可通过对象 ID 在任务间传递和复用；
- 三种消费方式：`checkPromise` 轮询、`onComplete` 回调、`await` 协程等待。

### 创建 Promise

~~~lua
local id = java.promise()        -- Object[] 结果作为普通对象（O:id）
local id2 = java.promise(true)   -- Object[] 结果展开为多值
~~~

### 静态方法异步调用

~~~lua
local id = java.promise()
java.runAsync(id, "java.lang.Integer", "parseInt", "42")
repeat
    local done, result = java.checkPromise(id)
until done
print(result)  -- 42
~~~

### 实例方法异步调用

~~~lua
local String = java.import("java.lang.String")
local s = String:new("Hello World")

local id = java.promise()
java.runAsyncObj(id, s, "length")
repeat
    local done, result = java.checkPromise(id)
until done
print(result)  -- 11
~~~

### 异步构造对象

~~~lua
local id = java.promise()
java.runAsync(id, "java.lang.String", "new", "Hello")
repeat
    local done, oid = java.checkPromise(id)
until done

local obj = java.getObject(tonumber(oid:sub(3)))  -- oid 形如 "O:42"
print(obj:length())  -- 5
~~~

### 多返回值

默认 `Object[]` 返回 `O:id`；若需要展开为多个 Lua 值，创建 Promise 时传入 `true`：

~~~lua
local String = java.import("java.lang.String")
local s = String:new("a,b,c")

local id = java.promise(true)
java.runAsyncObj(id, s, "split", ",")
repeat
    local done, a, b, c = java.checkPromise(id)
until done
print(a, b, c)  -- a  b  c
~~~

### 回调式消费：java.onComplete

~~~lua
local id = java.promise()
java.runAsync(id, "java.lang.Integer", "parseInt", "42")
java.onComplete(id, function(err, result)
    if err then
        print("失败:", err)
    else
        print("结果:", result)  -- 42
    end
end)
~~~

说明：

- 回调签名：`callback(err, result...)`；
- `err == nil` 表示成功，`result...` 与 `checkPromise` 返回值一致；
- `err` 为字符串时表示失败，内容为 `E:` 前缀后的错误信息；
- 若任务已完成再注册，会立即触发；
- 回调在后台工作线程执行，应快速返回；耗时重活请再次 `runAsync` 提交；
- 回调触发后 Promise 自动清理。

### 释放锁等待：java.yield

主线程轮询等待异步结果或代理回调时，`java.yield(ms)` 会短暂释放 Lua 互斥锁（默认 10ms）再重新获取，让后台工作线程有机会执行 Lua 回调，避免“主线程持锁等待 → 工作线程无法执行 Lua”的死锁。

~~~lua
local done = false
java.onComplete(id, function(err, result)
    done = true
end)
while not done do
    java.yield(10)
end
~~~

注意：`java.yield` 与 `Thread.sleep` 不同，`Thread.sleep` 不释放 Lua 锁。

### 协程等待：java.await

`java.await(id)` 在协程内挂起等待 Promise 完成。Java 任务完成后，工作线程在 `lua_mutex` 内恢复协程。

~~~lua
local co = coroutine.create(function()
    local id = java.promise()
    java.runAsync(id, "java.lang.Thread", "sleep", 200)
    java.await(id)
    print("done")
end)

coroutine.resume(co)
while coroutine.status(co) ~= "dead" do
    java.yield(5)
end
~~~

说明：

- 任务已完成时立即返回，结果语义与 `checkPromise` 一致；
- 任务失败时返回 `E:` 后的错误文本，不抛出异常；
- 非协程环境等待未完成任务会报 `attempt to yield from outside a coroutine`；
- `await` 不清理 Promise 条目；建议一个 id 只用一种消费方式；
- 主线程仍需用 `java.yield` 让出 Lua 锁，工作线程才能恢复协程。

### 异步错误处理

`checkPromise` 在任务失败时返回以 `E:` 开头的错误字符串，内容格式为：

~~~
类名.方法 -> 异常类型: 消息
~~~

示例：

~~~lua
local id = java.promise()
java.runAsync(id, "java.lang.NonExistent", "foo", "")
repeat
    local done, result = java.checkPromise(id)
until done
print(result)
-- 形如: E:java.lang.NonExistent.foo -> ClassNotFoundException: java.lang.NonExistent
~~~

同步调用 Java 方法抛出异常时，Lua 侧可用 `pcall` 捕获，错误信息包含 Java 异常类名与消息：

~~~lua
local ok, err = pcall(function()
    return obj:riskyMethod()
end)
-- err 形如: Java exception in riskyMethod: java.lang.IllegalStateException: detail
~~~

### 异步参数类型

- 标量：`string`、`number`、`boolean`、`char` 等按类型提示自动匹配；
- 支持 `String`、整数（`int`/`long`/`short`/`byte` 及包装类）、`float`/`double`、`char`/`Character`、`BigInteger`/`BigDecimal`、枚举常量名；
- Java 对象/数组 userdata 可直接传入：底层登记到参数对象池并以 `O` 提示传递，任务结束后自动释放；
- `table` / `function` 不能作为异步参数，会被字符串化或转成空字符串；
- 超出目标类型范围或无法解析时，任务返回 `no matching method: ... (原因)`。

---

## Clac 高性能数学库

`clac` 是完整的 C99 `<math.h>` 包装库，支持标量运算和批量数组运算。批量运算叠加三层加速：

- 手写 SIMD：x86_64 AVX2 / arm64 NEON，四则运算 `batch_add/sub/mul/div`；
- Sleef 向量内核：数学函数，`batch_sqrt`/`batch_abs` 直接使用硬件指令；
- OpenMP：元素数 >= 4096 时自动多线程（`OMP_NUM_THREADS` 可调）。

未启用 Sleef 或 OpenMP 时自动回退标量/单线程，结果一致。

### 基本用法

~~~lua
local clac = require("clac")

print(clac.pi())          -- 3.1415926535898
print(clac.e())           -- 2.7182818284590
print(clac.sin(1.57))     -- 0.99999968293183
print(clac.erf(1.0))      -- 0.84270079294971
print(clac.tgamma(5.0))   -- 24.0
~~~

### 批量数组运算

~~~lua
local a = clac.array(10000)
local b = clac.array(10000)

-- 填充数据...
local c = clac.batch_add(a, b)  -- 直接在 C 内存中完成
local d = clac.batch_sin(a)     -- 逐元素求正弦
~~~

### 支持的批量函数

| 分类 | 函数 |
|------|------|
| 四则运算 | `batch_add`, `batch_sub`, `batch_mul`, `batch_div` |
| 取整 | `batch_abs`, `batch_floor`, `batch_ceil`, `batch_round`, `batch_trunc`, `batch_rint`, `batch_nearbyint` |
| 指数对数 | `batch_exp`, `batch_exp2`, `batch_expm1`, `batch_log`, `batch_log10`, `batch_log2`, `batch_log1p` |
| 三角函数 | `batch_sin`, `batch_cos`, `batch_tan`, `batch_asin`, `batch_acos`, `batch_atan`, `batch_atan2` |
| 双曲函数 | `batch_sinh`, `batch_cosh`, `batch_tanh`, `batch_asinh`, `batch_acosh`, `batch_atanh` |
| 特殊函数 | `batch_erf`, `batch_erfc`, `batch_tgamma`, `batch_lgamma` |
| 其他 | `batch_sqrt`, `batch_cbrt`, `batch_pow`, `batch_hypot`, `batch_copysign`, `batch_fmod`, `batch_remainder`, `batch_nextafter`, `batch_fmax`, `batch_fmin`, `batch_fdim`, `batch_logb`, `batch_deg`, `batch_rad` |

### 随机数

`clac` 使用 xoshiro256 伪随机数生成器：

~~~lua
clac.seed()
local r = clac.random()       -- [0, 1)
local n = clac.random(100)    -- [1, 100]
local m = clac.random(10, 20) -- [10, 20]
~~~

---

## Utils 高精度工具库

`utils` 提供跨平台高精度时间测量和休眠功能，基于 `clock_gettime`（POSIX）和 `QueryPerformanceCounter`（Windows）实现纳秒级精度。

### 时间函数

~~~lua
local utils = require("utils")

local t  = utils.ns_time()          -- 当前时间（秒，浮点，纳秒级）
local mt = utils.monotonic_time()   -- 单调时间（不受系统时间影响）
local ts = utils.timestamp()        -- Unix 时间戳（秒，整数）
local ms = utils.timestamp_ms()     -- Unix 时间戳（毫秒，整数）
~~~

### 休眠函数

~~~lua
utils.sleep(0.5)        -- 休眠 0.5 秒
utils.sleep_ms(100)     -- 休眠 100 毫秒
utils.sleep_us(1000)    -- 休眠 1000 微秒
utils.sleep_ns(1000000) -- 休眠 1000000 纳秒
~~~

精度说明：POSIX 使用 `nanosleep`，实际精度受内核调度影响；Windows 使用 `WaitableTimer` + 忙等待混合策略。

### 计时器

~~~lua
local timer = utils.timer()

utils.sleep_ms(100)
print(timer:elapsed())  -- 从创建或 reset 到现在的总时间

utils.sleep_ms(50)
print(timer:lap())      -- 从上一次 lap 到现在的时间

timer:reset()
~~~

### 带超时轮询示例

~~~lua
local function wait_for_condition(check, timeout_sec)
    local start = utils.ns_time()
    while utils.ns_time() - start < timeout_sec do
        if check() then return true end
        utils.sleep_ms(1)
    end
    return false
end
~~~

---

## GC 引用管理

`gc` 模块提供 Java 对象引用的显式管理，支持强引用和弱引用，适用于跨 Lua 状态保持对象、防止提前回收、弱引用缓存等场景。

~~~lua
local java = require("java")
local gc = require("gc")

local String = java.import("java.lang.String")
local s = String:new("Hello")

local ref = gc.hold(s)       -- 强引用
local obj = gc.get(ref)
print(obj:length())          -- 5
print(gc.exists(ref))        -- true

local weakRef = gc.holdWeak(s)  -- 弱引用，不阻止 Java GC
gc.release(weakRef)

gc.release(ref)
print(gc.exists(ref))        -- false
~~~

常用函数：`gc.hold(obj)`、`gc.holdWeak(obj)`、`gc.get(id)`、`gc.release(id)`、`gc.exists(id)`、`gc.count()`、`gc.list()`、`gc.clear()`。

---

## 命令行

~~~bash
luaj                    # 启动交互式 REPL
luaj script.lua         # 执行脚本文件
luaj -e "print(1+1)"    # 执行一行代码
luaj -v                 # 版本信息（含编译器版本）
luaj -h                 # 帮助
~~~

### REPL 快捷键

| 快捷键 | 功能 |
|--------|------|
| ↑ ↓ | 在物理行间移动；到达首/末行后浏览历史 |
| Ctrl+R | 搜索历史 |
| 空行回车 | 提交多行语句块（单行完整语句回车即执行） |
| `\q` | 退出 |
| `= 1+2` | 打印表达式结果 |
| `help` / `copyright` / `license` | 查看信息 |

多行输入时续行提示符为 `>> `，并按 Lua 关键字自动缩进；未闭合的字符串/括号会保持续行，Ctrl+C 放弃当前未提交块。整块作为一条历史记录保存。

---

## 类型映射

| Lua 类型 | Java 方向 |
|----------|-----------|
| `nil` | `null` / `void` 返回 |
| `boolean` | `boolean` / `Boolean` 双向 |
| `integer` | `int` / `long` / `Integer` / `Long` 双向 |
| `number` | `double` / `float` / `Double` / `Float` 双向 |
| `string` | `String` 双向 |
| `string`（单个码点）或整数 | `char` / `Character` 双向 |
| `userdata` | Java 对象双向 |
| `function` | `LuaFunctionObj`（Lua -> Java） |
| `table` | `LuaTable`（Lua -> Java 惰性活引用） |
| Java `Map` / `List` / `Collection` 返回 | Lua 惰性容器 userdata（读取/遍历/写回/追加） |
| Java 数组 | `Java.Array` userdata（0 基索引、`#` 长度、元素读写） |

说明：

- 字符串双向按标准 UTF-8 转换；emoji 等增补平面字符（4 字节 UTF-8）可正确往返；
- 非法 UTF-8 字节或孤立 UTF-16 代理项会替换为 `U+FFFD`；
- Java `char` / `Character` 只能表示 BMP 码点；
- Java 数组在 Lua 中索引从 0 开始，`#arr` 返回数组长度；
- Java `Map` / `List` 代理容器使用 Lua 风格下标：List 从 1 开始，`l[#l + 1] = v` 等价追加。

---

## API 参考

### LuaRuntime（Java 侧入口）

| 方法 | 说明 |
|------|------|
| `LuaRuntime()` | 创建 Lua 虚拟机 |
| `doString(script)` | 执行 Lua 代码 |
| `doFile(path)` | 执行 Lua 文件 |
| `callFunction(name, ...)` | 调用全局函数，返回第一个值 |
| `callFunctionMultiple(name, ...)` | 调用全局函数，返回所有值 |
| `compile(code)` | 编译为 `LuaFunctionObj` |
| `registerModule(obj)` | 注册带 `@LuaModule` 注解的对象 |
| `setGlobal(name, value)` | 设置 Lua 全局变量 |
| `getGlobal(name)` | 读取全局变量并转为字符串 |
| `getGlobalObject(name)` | 读取全局变量原始对象 |
| `close()` | 关闭虚拟机 |

### Lua 侧 java 库

| 函数 | 说明 |
|------|------|
| `java.import("类名")` | 导入 Java 类 |
| `类:new(...)` / `类(...)` | 调用构造方法 |
| `对象:方法(...)` | 调用实例方法 |
| `对象(...)` | 调用对象 `call` 方法（`__call`） |
| `类.静态方法(...)` / `类:静态方法(...)` | 调用静态方法 |
| `java.createProxy({接口...}, 表)` | Lua 表实现 Java 接口 |
| `java.newArray("类型", 大小)` | 创建 Java 数组 |
| `java.promise([expand_arrays])` | 创建异步 Promise |
| `java.runAsync(id, class, method, args...)` | 异步调用静态方法 |
| `java.runAsyncObj(id, obj, method, args...)` | 异步调用实例方法 |
| `java.checkPromise(id)` | 轮询 Promise 结果 |
| `java.onComplete(id, callback)` | 注册完成回调 |
| `java.await(id)` | 协程内挂起等待 Promise 完成 |
| `java.yield(ms)` | 释放 Lua 锁等待，让后台回调执行 |
| `java.getObject(id)` | 获取异步返回的对象 |
| `java.toString(obj)` | 获取对象的字符串表示 |
| `java.store(key, value)` | 跨 Lua 状态存储值 |
| `java.fetch(key)` | 读取跨状态存储值 |
| `java.listall()` | 列出所有存储键值对 |
| `java.deleteStore(key)` | 删除跨状态存储键 |
| `java.cleanup()` | 清空跨状态存储的全部键值 |

### Lua 侧 clac 库

| 函数 | 说明 |
|------|------|
| `clac.array(n)` | 创建 `ClacArray` |
| `clac.pi()` / `clac.e()` | 数学常量 |
| `clac.sin(x)` / `clac.cos(x)` / ... | 标量数学函数 |
| `clac.batch_add(a, b)` / `batch_sub(...)` | 批量四则运算 |
| `clac.batch_sin(a)` / `batch_cos(a)` / ... | 批量一元函数 |
| `clac.batch_pow(a, b)` / `batch_atan2(a, b)` / ... | 批量二元函数 |
| `clac.random()` / `clac.seed()` | 随机数生成 |

### Lua 侧 utils 库

| 函数 | 说明 |
|------|------|
| `utils.ns_time()` | 高精度时间（秒） |
| `utils.monotonic_time()` | 单调时间（秒） |
| `utils.timestamp()` | Unix 时间戳（秒） |
| `utils.timestamp_ms()` | Unix 时间戳（毫秒） |
| `utils.sleep(sec)` | 休眠指定秒数 |
| `utils.sleep_ms(ms)` | 休眠指定毫秒数 |
| `utils.sleep_us(us)` | 休眠指定微秒数 |
| `utils.sleep_ns(ns)` | 休眠指定纳秒数 |
| `utils.timer()` | 创建计时器对象 |

### Lua 侧 gc 库

| 函数 | 说明 |
|------|------|
| `gc.hold(obj)` | 创建强引用 |
| `gc.holdWeak(obj)` | 创建弱引用 |
| `gc.get(ref)` | 获取引用对象 |
| `gc.release(ref)` | 释放引用 |
| `gc.exists(ref)` | 检查引用是否存在 |
| `gc.count()` | 获取引用数量 |
| `gc.list()` | 列出所有引用 ID |
| `gc.clear()` | 清除所有引用 |

---

## 构建

要求：JDK 17+、CMake 3.14+、GCC/Clang、pthread。

可选依赖缺失时自动回退，不影响构建：

- OpenMP：`clac` 批量运算多线程；
- Sleef：`clac` 批量数学 AVX2 向量内核（需同时具备 `sleef.h` 与 `libsleef`，可通过 `-DLUAJAVA_ENABLE_SLEEF=OFF` 关闭）。

~~~bash
git clone https://github.com/npp-zep/LuaJavaNE.git
cd LuaJavaNE
make        # 标准构建
make ninja  # Ninja 快速构建
make test   # 运行测试
~~~

---

## 已知问题与限制

### 参数匹配与重载

- 6 个参数以内优先走快速签名匹配；7 个及以上自动回退到 Java 反射，结果正确但性能略低；
- 反射回退按精确度打分选择重载；泛型擦除、可变参数或高度动态的同名方法仍可能选不到预期版本，失败时报 `no matching method: ... (原因)`；
- 调用 Java 方法抛出的异常会以 Lua 错误形式抛出，信息包含 `java.lang.异常类: message`；
- 异步任务错误格式为 `类名.方法 -> 异常类型: 消息`，`checkPromise` 返回以 `E:` 开头。

### 多线程与 Lua 状态

- 所有 `LuaRuntime` 实例共享一把递归 `lua_mutex`；一个状态长时间执行 Lua 代码会阻塞其他状态的调用和回调；
- 异步回调、代理回调与 `java.await` 恢复都依赖主线程用 `java.yield(ms)` 让出锁；持锁死等会形成死锁；
- 同一个 `LuaRuntime` 不应被多个线程同时直接操作（Lua 状态本身非线程安全）；
- `java.store` 是进程级全局表，跨状态共享是设计特性，不随单个 `LuaRuntime` 关闭而清空；可用 `java.cleanup()` 整体清空。

### 异步 API

- Lua 侧未暴露取消和超时参数；底层默认超时 300 秒；
- 对象参数通过参数对象池传递，任务结束由 `AsyncRunner` 释放；若线程池直接拒绝任务（`AbortPolicy`），引用可能残留到进程结束（极端边界）；
- `table` / `function` 不能作为异步参数；
- `java.await` 失败时返回 `E:` 后的错误文本而不是抛出异常；非协程环境等待未完成任务会报 `attempt to yield from outside a coroutine`；
- `onComplete` 回调运行在工作线程，必须快速返回；耗时操作应再次 `runAsync`；
- 异步结果池默认按 FIFO 保留最近 10000 个未被取走的结果；被淘汰的 ID 再调用 `java.getObject` 会抛出错误，不再静默返回 `nil`。

### Unicode 与字符串

- Java `String` 中的 NUL 可保留在 Lua 字符串中，但部分按 C 字符串处理的 API 可能截断；
- 非法 UTF-8 字节序列、孤立代理项统一替换为 `U+FFFD`，不做报错；
- Java `char` / `Character` 只能表示 BMP 码点；Lua 侧传入增补平面字符时只能取高代理项。

### 平台与构建

- Termux/Android 环境下线程数上限约 200（受系统限制）；
- OpenMP、Sleef 为可选依赖，缺失时自动回退到串行/标量实现，性能下降但功能不变；
- 项目绑定 Lua 5.4.x；升级 Lua 需整体替换 `lua/lua-5.x` 目录（Lua 源码零改动）。

---

## 贡献

~~~bash
git clone git@github.com:npp-zep/LuaJavaNE.git
cd LuaJavaNE
git checkout -b feature/my-feature
# 修改代码
make && make test
git commit -m "Description"
git push origin feature/my-feature
# 在 GitHub 上提 Pull Request
~~~

---

## 许可证

本项目主体采用 MIT License。

### 第三方依赖

- Lua 5.4.8 — MIT License
- JLine 3 — BSD-3-Clause License
- Sleef — Boost Software License 1.0
- JUnit 5 — EPL-1.0（仅用于测试，不包含在发布包中）

作者：npp-zep

---

*文档最后更新：v2.4.1*