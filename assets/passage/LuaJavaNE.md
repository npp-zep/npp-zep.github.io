# LuaJavaNE - Lua与Java的互调引擎

## 项目灵感

当时我还在用Lua5.3的LuaJava项目来开发一些东西。
但是我在网上查关于Lua的资料时，几乎全是Lua5.4甚至是5.5的信息
我这个Lua5.3当然是不支持那些新现代特性了，所以我寻思着反正我也没啥事，就做了这个项目
(故此更新有点随缘)

## 下载方式

### git下载源码:
- `git clone https://github.com/npp-zep/LuaJavaNE.git`
### release下载:
- 打开 **https://github.com/npp-zep/LuaJavaNE**
- 下滑页面，访问**Release**
- 下载你所**需要的平台所对应的压缩包**   比如*luajavane-v2.2.1-Linux-arm64.tar.gz*


## 项目环境要求

### 从源码编译
- Cmake 4.3.0
- make 4.4.1
- clang/gcc
- openJDK >=17
- pthread
- (可选工具:ninja)
### 从Release使用
- openJDK(如果你不自己写class,JRE也可) >=17

## 编译方式:
- 确保 **openJDK 版本>=17** 且满足*项目环境要求里的源码编译部分* (推荐17，高于尚可，不过会有警告某些方法已经弃用)
- 在项目**根目录**输入*make* 或者 *make ninja*来编译
- 等待编译完成后可以输入*make test*来借助junit进行测试

- 然后你可以使用`./luaj.sh`来启动LuaJavaNE的repl

## 项目亮点
升级 Lua 版本

本项目 Lua 源码完全保持原样，不进行任何修改。
升级到新版本只需两步：

1. 删除旧版本目录：
   ```bash
   rm -rf lua/lua-5.4.8
   ```
2. 下载新版本并解压到 lua/ 目录：
   ```bash
   wget https://lua.org/ftp/lua-5.5.0.tar.gz
   tar xzf lua-5.5.0.tar.gz -C lua/
   ```

构建系统会自动识别 lua/lua-* 目录，无需改动任何代码或配置。

## 项目使用方法

### 作为库使用

#### Java 调用 Lua

```java
LuaRuntime L = new LuaRuntime();
L.doString("function add(a, b) return a + b end");
Object result = L.callFunction("add", 3, 5); // 8

LuaFunctionObj fn = L.compile("return function(x) return x * 2 end");
LuaFunctionObj doubler = (LuaFunctionObj) fn.call();
doubler.call(21); // 42
fn.destroy(); doubler.destroy();
L.close();
```

#### Lua 调用 Java

```lua
local java = require("java")
local String = java.import("java.lang.String")
local s = String:new("Hello World")
print(s:length())          -- 11
print(s:substring(0, 5))   -- Hello
```

#### 注解绑定

```java
@LuaModule("math")
class MyMath {
    @LuaFunction public int add(int a, int b) { return a + b; }
    @LuaFunction("multiply") public int mul(int a, int b) { return a * b; }
}
LuaRuntime L = new LuaRuntime();
L.registerModule(new MyMath());
L.doString("print(math_add(3, 5))");      // 8
L.doString("print(math_multiply(6, 7))"); // 42
```

### 动态代理

#### 用 Lua 表实现 Java 接口：

```lua
local Runnable = java.import("java.lang.Runnable")
local handler = { run = function(self) print("Hello from Lua!") end }
local proxy = java.createProxy({"java.lang.Runnable"}, handler)
java.import("java.lang.Thread"):new(proxy):start()
```

---

### Agent v2 异步 API（多线程）

Agent v2 提供强大的异步执行能力，所有任务在后台线程池中运行，结果通过 Promise 机制回传主线程。

#### 静态方法异步调用

```lua
local id = java.promise()
java.runAsync(id, "java.lang.Integer", "parseInt", "42")
repeat local done, result = java.checkPromise(id) until done
print(result)  -- 42
```

#### 实例方法异步调用

```lua
local String = java.import("java.lang.String")
local s = String:new("Hello World")
local id = java.promise()
java.runAsyncObj(id, s, "length")
repeat local done, result = java.checkPromise(id) until done
print(result)  -- 11
```

#### 异步构造对象

```lua
local id = java.promise()
java.runAsync(id, "java.lang.String", "new", "Hello")
repeat local done, oid = java.checkPromise(id) until done
local obj = java.getObject(oid)   -- 获取 userdata
print(obj:length())               -- 5
```

#### 多返回值

```lua
local s = String:new("a,b,c")
local id = java.promise()
java.runAsyncObj(id, s, "split", ",")
repeat local done, a, b, c = java.checkPromise(id) until done
print(a, b, c)  -- a   b   c
```

#### 错误处理

异步任务中抛出的异常会被捕获并作为字符串返回：

```lua
java.runAsync(id, "java.lang.NonExistent", "foo", "")
-- checkPromise 返回: "java.lang.ClassNotFoundException: java.lang.NonExistent"
```

#### 并发性能

· 50 个并发 Thread.sleep(10ms) 任务总耗时约 0.05 秒
· 100 次串行异步调用约 0.43 秒
· 线程池自动管理（daemon 线程），LuaRuntime.close() 或进程退出时自动关闭

详细文档见 docs/async-api.md

---

### Clac 高性能数学库

clac 模块提供了完整的 C 标准数学函数，以及批量数组运算（83 倍加速）。

#### 基本用法

```lua
local clac = require("clac")
print(clac.pi())            -- 3.1415926535898
print(clac.sin(1.57))       -- 0.99999968293183
print(clac.erf(1.0))        -- 0.84270079294971
print(clac.tgamma(5.0))     -- 24.0
```

#### 批量运算（ClacArray）

```lua
local a = clac.array(10000)
local b = clac.array(10000)
-- 填充数据...
local c = clac.batch_add(a, b)  -- 直接在 C 内存中完成，比 Lua 表循环快 83 倍
local d = clac.batch_sin(a)     -- 逐元素求正弦
```

---

### 命令行

```bash
luaj                    # 启动交互式 REPL
luaj script.lua         # 执行脚本文件
luaj -e "print(1+1)"    # 执行一行代码
luaj -v                 # 版本信息（含编译器版本）
luaj -h                 # 帮助
```

REPL 快捷键

快捷键 功能
↑ ↓ 浏览历史
Ctrl+R 搜索历史
\q 退出
= 1+2 打印表达式结果
help / copyright / license 查看信息

---
API 参考

LuaRuntime（Java 侧入口）

方法 说明
LuaRuntime() 创建 Lua 虚拟机
doString(script) 执行 Lua 代码
doFile(path) 执行 Lua 文件
callFunction(name, ...) 调用全局函数，返回第一个值
callFunctionMultiple(name, ...) 调用全局函数，返回所有值
compile(code) 编译为 LuaFunctionObj
registerModule(obj) 注册带 @LuaModule 注解的对象
close() 关闭虚拟机

Lua 侧 java 库

函数 说明
java.import("类名") 导入 Java 类
类:new(...) 调用构造方法
对象:方法(...) 调用实例方法
类.静态方法(...) 调用静态方法
java.createProxy({接口...}, 表) Lua 表实现 Java 接口
java.newArray("类型", 大小) 创建 Java 数组
java.promise() 创建异步 Promise
java.runAsync(id, class, method, args...) 异步调用静态方法
java.runAsyncObj(id, obj, method, args...) 异步调用实例方法
java.checkPromise(id) 轮询 Promise 结果
java.getObject(id) 获取异步构造的对象

---

## 缺点
· compile() 方法在 x86_64 Linux 上可能崩溃（ARM64 正常）
· 方法重载匹配按返回类型优先级尝试，复杂重载可能不精确
· Java的Math模块在Lua端行为异常
· Proxy存在卡死的bug
· Compat 层存在问题，暂时禁用
· 异步方法目前仅支持单个参数（后续扩展）
· Termux/Android 环境下线程数上限约 200（受系统限制）


## 许可证

MIT License。
本项目包含 Lua 5.4.8 (MIT)、JLine 3 (BSD-3)、JUnit 5 (EPL-1.0)。

作者: npp-zep

