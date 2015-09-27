'use strict';

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
	vg-p-{paramName}={paramValue}  :  paramName为请求参数名， paramValue为参数值， 示例：
		<div vg-param-name='Peter'></div>
		则这个div有参数name，值为Peter。

	不支持功能列表:
	1.无法跨域

*/
var viewGetter = {};

// 配置信息   暂时无用。
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
	styles: [],
	scripts: [],
	content: null // 请求描述对应的响应内容， 请求一次后便缓存起来
}];

// 样式集合
viewGetter.styles = [];

// 脚本集合
viewGetter.scripts = [];


// 初始化页面， 加载模板内容
viewGetter.initial = function() {
	viewGetter.requestDesc = [];

	var objs = $('[vg-url]'),
		arrDesc = viewGetter.requestDesc;

	viewGetter.appendRequestDesc(objs);
	viewGetter.sendRequestAndFillContainer();
};



/* 获取请求信息
 * {params} requestObjs： 需要发送请求的对象集合，即包含vg-url属性的对象
 */
viewGetter.appendRequestDesc = function(requestObjs) {
	var arrDesc = viewGetter.requestDesc;

	// Get url array
	requestObjs.each(function(i) {
		var me = $(this),
			url = me.attr('vg-url'),
			params = viewGetter.getRequestParams(me),
			key = viewGetter.getDescKey(url, params);

		var desc = viewGetter.getRequestDescByKey(key);
		if (!desc) {
			desc = {
				key: key,
				url: url,
				params: params,
				responseContext: '',
				containers: [],
				content: null
			};
		}
		viewGetter.appendContainerIntoRequestDesc(desc, this);
		arrDesc.push(desc);
	});
};

/* 获取请求对象的请求参数
 * {params} requestObj: 请问对象
 */
viewGetter.getRequestParams = function(requestObj) {
	if (!requestObj || !requestObj.attributes || !requestObj.attributes.length) {
		return null;
	}
	var params = {};
	for (var i = 0, attrs = requestObj.attributes, len = attrs.length; i < len; i++) {
		var attr = attrs[i],
			attrName = '';

		if (attr.nodeName.indexOf('vg-p-') == 0) {
			attrName = attr.nodeName.substr(5);
			params[attrName] = attr.nodeValue;
		}
	}
	return params;
};

// 获取请求描述的key
viewGetter.getDescKey = function(url, params) {
	return "{" + (url || "") + "}++{" + (params ? JSON.stringify(params) : "") + "}";
};

// 通过key获取请求描述
viewGetter.getRequestDescByKey = function(key) {
	var arrDesc = viewGetter.requestDesc;
	for (var i = 0, len = arrDesc.length; i < len; i++) {
		if (arrDesc[i]['key'] == key) {
			return arrDesc[i];
		}
	}
	return null;
};

/* 将容器添加进请求描述中
 */
viewGetter.appendContainerIntoRequestDesc = function(desc, container) {
	if (!desc) {
		return false;
	}

	desc.containers = desc.containers || [];
	desc.containers.push(container);
	return true;
};

/* 	发送请求，并用响应结果填充请求描述对应的容器	
	若请求描述中已缓存响应内容，则直接填充
 */
viewGetter.sendRequestAndFillContainer = function() {
	var arrDesc = viewGetter.requestDesc;
	for (var i = 0, len = arrDesc.length; i < len; i++) {
		var currentUrl = arrDesc[i].url; // 相对路径
		var currentParams = arrDesc[i].params || {}; // 请求参数 
		var containers = arrDesc[i].containers; // 容器
		var currentContent = arrDesc[i].content;

		if (typeof responseContext === 'undefined') {
			currentParams["temp"] = Math.random();

			$.ajax({
				"url": currentUrl,
				"data": currentParams,
				"success": (function(requestDesc) {
					return function(data) {
						var responseText = data.replace(/[\n\t\r]/g, '');
						var responseContext = viewGetter.getResponseContext(responseText);
						$(requestDesc.containers).each(function() {
							$(this).html(responseContext);
						});
						requestDesc.content = responseContext;
					}
				})(arrDesc[i]),
				"dataType": "html",
				"type": 'GET'
			});
		} else {
			$(containers).each(function() {
				$(this).html(currentContent);
			});
		}
	}
};

// 获取响应的内容
viewGetter.getResponseContext = function(text) {
	var responseContext = text;

	/* 	创建html标签，去除其中的style、script标签。返回body的innerHTML */
	var htmlObj = viewGetter.createHtmlObj(responseContext);
	responseContext = $(htmlObj).find('body').html();
	return responseContext;
};

// 创建html对象
viewGetter.createHtmlObj = function(outerHtml) {
	try {
		var html = document.createElement('html');
		var $html = $(html);
		// 去除html标签
		var clearTagHtml = outerHtml.replace(/^<html>|<\/html>$/gim, '');
		// 去除style标签
		clearTagHtml = viewGetter.appendStyle(clearTagHtml);
		// 去除script标签
		clearTagHtml = viewGetter.appendScript(clearTagHtml);

		$html.html(clearTagHtml);
		return html;
	} catch (ex) {
		console.error(ex.stack);
		return null;
	}
};

viewGetter.appendStyle = function(outerHtml) {
	var styles = outerHtml.match(/(<style.*?<\/style>)/gim),
		links = outerHtml.match(/(<link.*?type="text\/css".*?<\/link>)/gim),
		clearTagHtml = outerHtml,
		styleTag, linkTag,
		headTag = $('head');

	if (styles) {
		for (var i = 0, len = styles.length; i < len; i++) {
			styleTag = createStyleTag(styles[i]);
			headTag.append(styleTag);

			outerHtml = outerHtml.replace(styles[i], '');
		}
	}

	if (links) {
		for (var i = 0, len = links.length; i < len; i++) {
			linkTag = createLinkTag(links[i]);
			headTag.append(linkTag);

			outerHtml = outerHtml.replace(links[i], '');
		}
	}
	return outerHtml;
};

viewGetter.appendScript = function(outerHtml) {
	var scripts = outerHtml.match(/(<script.*?<\/script>)/gim),
		clearTagHtml = outerHtml,
		scriptTag,
		bodyTag = $('body');

	if (scripts) {
		for (var i = 0, len = scripts.length; i < len; i++) {
			scriptTag = createScriptTag(scripts[i]);
			bodyTag.append(scriptTag);

			outerHtml = outerHtml.replace(scripts[i], '');
		}
	}
	return outerHtml;
};

function createStyleTag(styleText) {
	var styleContent = styleText.replace(/^<style.*?>|<\/style>$/gim, ''),
		styleTag = document.createElement('style');

	styleTag.type = 'text/css';
	styleTag.innerHTML = styleContent;
	return styleTag;
}

function createLinkTag(linkText) {
	var linkContent = linkText.replace(/^<link.*?>|<\/link>$/gim, ''),
		linkTag = document.createElement('link'),
		href = linkText.match(/href="(.*?)"/);

	link.rel = "stylesheet";
	linkTag.type = 'text/css';
	linkTag.href = RegExp.$1;
	return linkTag;
}

function createScriptTag(scriptText) {
	var scriptContent = scriptText.replace(/^<script.*?>|<\/script>$/gim, ''),
		scriptTag = document.createElement('script'),
		src = scriptText.match(/src="(.*?)"/);

	scriptTag.type = 'text/css';
	if (src) {
		scriptTag.src = src;
	} else {
		scriptTag.innerHTML = scriptContent;
		eval(scriptContent);
	}
	return scriptTag;
}