/*
	copyright: Steven Weng
	created on: 2015/04/16

	依赖：  1. jquery 1.9.0
			2. json2.js

	术语解释：
	1. 容器： 		添加了vg-url属性的标签。 暂时只测试body、div标签
	2. 请求描述； 	包含请求路径、参数等信息的json对象集合。 
					多个容器可能使用相同的请求描述，为了避免重复发送请求，
					会将所有容器的请求描述抽取缓存。
	3. 响应内容：	根据请求描述发送请求后，获取到的响应文本，
					当文本为html标签时，获取html里的body对象的innerHtml作为响应内容，
					当文本不为html标签，则响应文本直接作为响应内容。

	使用说明：
	vg-url=''  ： 值为请求路径
	vg-param-{paramName}={paramValue}  :  paramName为请求参数名， paramValue为参数值， 示例：
		<div vg-param-name='Peter'></div>
		则这个div有参数name，值为Peter。

	Question List:
	1.template文件中，不允许存在style，script标签。
	2.无法跨域


	todo list:
	-- 20150416
	1. 标签增加selector属性
	2. 标签增加params属性
	3. 初始化时可传入config， 设置url的简称、默认参数、 和留下余地给将来更多的加载配置

*/
var viewGetter = {};

// 配置信息
viewGetter.config = {
	domain: "", // 域路径
	returnType: "" // 返回方式

};

// 拆分方法， 1： 获取请求描述集合； 2： 根据请求描述进行请求，并获取返回内容； 3： 根据返回方式，利用返回内容进行后续操作。

// 请求描述示例格式, 数组形式
viewGetter.requestDesc = [{
	key: '',
	/* 由url+序列化params组成的字符串， 
	 * 用于快速判断容器请求是否重复。格式为"{url}++{序列化params}"
	 * 弱没有请求参数，则序列化params为空字符串。
	 */

	url: '', // 请求路径
	params: {}, // 请求参数

	responseContext: '', // 响应内容

	containers: [], // 使用该请求的容器集合
	callback: null // 回调函数
}];

/* 获取请求信息
 * {params} requestObjs： 需要发送请求的对象集合，即包含vg-url属性的对象
 */
viewGetter.getRequestDesc = function(requestObjs) {
	var arrDesc = viewGetter.requestDesc;

	// Get url array
	requestObjs.each(function(i) {
		var me = $(this),
			url = me.attr('vg-url'),
			params = viewGetter.getRequestParams(me),
			key = viewGetter.getDescKey(url, params);

		// TODO 需要改成对desc的key进行重复判断,重复的话，添加到desc的containers数组，不重复的话，新增desc并插入desc数组。
		if (isRequestDescExist(key)) {

		}
		else{
			arrDesc.push({
				key: key,
				url: url,
				params: params,
				responseContext: '',
				containers: [ this ]
			});
		}
	});
	return false;
}

/* 获取请求对象的请求参数
 * {params} requestObj: 请问对象
 */
viewGetter.getRequestParams = function(requestObj) {
	if (!requestObj || !requestObj.attributes || !requestObj.attributes.length) {
		return null;
	}
	var params = {};
	for (var i = 0, attrs = requestObj.attributes, len = attrs.length; 
		i < len; i++) {
		var attr = attrs[i],
			attrName = '';

		if(attr.nodeName.indexOf('vg-p-')==0){
			attrName = attr.nodeName.substr(5);
			params[attrName] = attr.nodeValue;
		}
	}
	return params;
}

/* 判断请求描述是否已存在
 * {params} key[string] : url+params序列化拼接成的key，可代表唯一的请求描述
 */
viewGetter.isRequestDescExist = function (key) {
	var arrDesc = viewGetter.requestDesc;
	for(var i = 0, len = arrDesc.length; i < len; i++){
		if(arrDesc[i]['key'] == key){
			return true;
		}
	}
	return false;
}

// 获取请求描述的key
viewGetter.getDescKey = function (url, params) {
	return "{" + (url ?? "") + "}++{" + params ?? JSON.stringify(params) : "" +"}";;	
}

// 初始化页面， 加载模板内容
viewGetter.initial = function() {
	var objs = $('[vg-url]'),
		arrUrl = [];

	// Get url array
	objs.each(function(i) {
		var me = $(this);
		url = me.attr('vg-url');

		if ($.inArray(url, arrUrl) < 0) {
			arrUrl.push(url);
		}
	});

	// send requests
	for (var i = 0, len = arrUrl.length; i < len; i++) {
		var currentUrl = arrUrl[i]; // 相对路径
		var mappingObjs = objs.filter('[vg-url="' + currentUrl + '"]');

		$.ajax({
			"url": currentUrl,
			"data": {
				temp: Math.random()
			},
			"success": (function(objs) {
				return function(data) {
					var responseText = data.replace(/[\n\t\r]/g, '');
					var responseContext = viewGetter.getResponseContext(responseText);

					objs.each(function() {
						$(this).append(responseContext);
					});
				}
			})(mappingObjs),
			"dataType": "html",
			"type": 'POST'
		});
	}
}

// 获取响应的内容
viewGetter.getResponseContext = function(text) {
	var responseContext = text,
		htmlTagReg = /^<html>.*<\/html>/im;

	/* 	branch 1: html标签， 创建html标签，去除其中的style、script标签。返回body的innerHTML
		branch 2：非html标签， 直接返回文本 
	 */
	if (htmlTagReg.test(responseContext)) {
		var htmlObj = viewGetter.createHtmlObj(responseContext);
		responseContext = $(htmlObj).find('body').html();
	}
	return responseContext;
}

// 创建html对象
viewGetter.createHtmlObj = function(outerHtml) {
	try {
		var html = document.createElement('html');
		var $html = $(html);
		// 去除html标签
		var clearTagHtml = outerHtml.replace(/^<html>|<\/html>$/im, '');
		// 去除style标签
		clearTagHtml = clearTagHtml.replace(/<style.*<\/style>/gim, '');
		// 去除script标签
		clearTagHtml = clearTagHtml.replace(/<script.*<\/script>/gim, '');

		$html.html(clearTagHtml);
		return html;
	} catch (ex) {
		return null;
	}
}