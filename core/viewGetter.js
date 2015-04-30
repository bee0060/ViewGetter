/*
	copyright: Steven Weng
	created on: 2015/04/16

	依赖： jquery 1.9.0


	todo list:
	-- 20150416
	1. 标签增加selector属性
	2. 标签增加params属性
	3. 初始化时可传入config， 设置url的简称、默认参数、 和留下余地给将来更多的加载配置

*/
var viewGetter = {};
viewGetter.initial = function(){
	var objs = $('[vg-url]'),
	arrUrl = [];

	// Get url array
	objs.each(function(i){
		var me = $(this);
		url = me.attr('vg-url');

		if($.inArray(url, arrUrl)<0){
			arrUrl.push(url);
		}
	});

	// send requests
	for(var i =0,len=arrUrl.length;i<len;i++)
	{
		var currentUrl = arrUrl[i];
		var mappingObjs = objs.filter('[vg-url="'+currentUrl+'"]');

		$.ajax({
				"url":  currentUrl,
				"data": {temp:Math.random()},
				"success": (function(objs){
						return function (data) {
							var html = data.replace(/[\n\t\r]/g,'');
							var responseHtml = $(viewGetter.createTagObj('html',html));
							var responseBody = responseHtml.find('body');					
							objs.each(function(){ $(this).html(responseBody.html())});
						}
				})(mappingObjs),
				"dataType": "html",
				"type": 'POST'
			});
	}
}

viewGetter.createTagObj = function(tagName, outerHtml){
	try{
		var tag = document.createElement(tagName);
 		var $tag = $(tag);
 		var clearTag
 		$tag.html(outerHtml.replace(/^<html>|<\/html>$/g,''));
		return tag;
	}
	catch(ex)
	{
		return null;
	}
}