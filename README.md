ViewGetter
======

#视图获取插件，通过给标签配置属性，自动异步访问并获取目标内容（html）加载到当前标签中。

依赖：  1. jquery 1.9.0

		2. json2.js

术语解释：
1. 容器： 		添加了vg-url属性的标签。 暂时只测试body、div标签

2. 请求描述； 	包含请求路径、参数等信息的json对象集合。 多个容器可能使用相同的请求描述，为了避免重复发送请求，会将所有容器的请求描述抽取缓存。

3. 响应内容：	根据请求描述发送请求后，获取到的响应文本，当文本为html标签时，获取html里的body对象的innerHtml作为响应内容，当文本不为html标签，则响应文本直接作为响应内容。

使用说明：

-vg-url=''  ： 值为请求路径

-vg-p-{paramName}={paramValue}  :  paramName为请求参数名， paramValue为参数值， 示例：

	<div vg-param-name='Peter'></div>
	则这个div有参数name，值为Peter。

不支持功能列表:
1.无法跨域