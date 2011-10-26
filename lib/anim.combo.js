/*import from ../components/animation/anim.frame.js,(by build.py)*/

/*
 *	http://qwrap.com
 *	version: $version$ $release$ released
 *	author: akira.cn@gmail.com
 */

/**
 * @helper AnimationTimingH 动画Helper
 * @namespace QW
 * @support http://www.w3.org/TR/animation-timing/
 */

(function(){

var mix = QW.ObjectH.mix,
	EventTargetH = QW.EventTargetH,
	forEach = Array.forEach || QW.ArrayH.forEach;

var requestAnimationFrame = window.requestAnimationFrame,
	cancelRequestAnimationFrame = window.cancelRequestAnimationFrame;

function getAnimationFrame(){
	if(requestAnimationFrame){
		return {
			request :requestAnimationFrame,
			cancel : cancelRequestAnimationFrame
		}
	} else if(window.msRequestAnimationFrame) {
		return {
			request :msRequestAnimationFrame,
			cancel : msCancelRequestAnimationFrame
		}
	} else if(window.webkitRequestAnimationFrame){
		return {
			request : function(callback){
				//修正某个诡异的webKit版本下没有time参数
				return window.webkitRequestAnimationFrame(
						function(){
							return callback(new Date());
						}
					);
			},
			cancel : window.webkitCancelRequestAnimationFrame
		}
	} else {
		return AnimationTimingManager;
	}
};


if(!(window.requestAnimationFrame || 
	 window.webkitRequestAnimationFrame ||
	 window.msRequestAnimationFrame))
{
	var AnimationTimingManager = (function(){
		var millisec = 25;	 //40fps;
		var request_handlers = [];
		var id = 0, cursor = 0;

		function playAll(){
			var clone_request_handlers = request_handlers.slice(0);
			cursor += request_handlers.length;
			request_handlers.length = 0; //clear handlers;
			
			forEach(clone_request_handlers, function(o){
				if(o != "cancelled")
					return o(new Date());
			});
		}
		
		if(window.mozRequestAnimationFrame)
			window.addEventListener("MozBeforePaint", playAll, false);
		else
			window.setInterval(playAll, millisec);

		return {
			request : function(handler){
				request_handlers.push(handler);
				if(window.mozRequestAnimationFrame) window.mozRequestAnimationFrame();
				return id++;
			},
			cancel : function(id){
				request_handlers[id-cursor] = "cancelled";
			}
		};
	
	})();
}

var AnimationTimingH = {
	/*long*/ requestAnimationFrame : function(/*window*/ owner, /*in FrameRequestCallback*/ callback){
		var raf = getAnimationFrame();
		return raf.request.call(owner, callback);
	},
	cancelRequestAnimationFrame : function(/*window*/ owner, /*in long*/ handle){
		var raf = getAnimationFrame();
		return raf.cancel.call(owner, handle);
	}
};

var ah = QW.HelperH.methodize(AnimationTimingH);
mix(window, ah);
})();/*import from ../components/animation/anim.base.js,(by build.py)*/

(function() {
	var CustEvent = QW.CustEvent,
		mix = QW.ObjectH.mix;

	var Anim = function(action, dur, opts) {
		mix(this, opts);
		mix(this, {
			action: action,	//action，动画函数，
			dur: dur!=null?dur:800,	//动画时长
			_timeStamp: new Date()
		});
		CustEvent.createEvents(this, ANIM_EVENTS);
	};
	
	ANIM_EVENTS = ['beforestart','enterframe','pause','resume','end','reset'];

	function _request(anim, per){
		if(per == null) per = anim.per;
		anim.action(per);
		anim._timeStamp = new Date() - per * anim.dur; //从当前帧反算startTime
		anim.per = per;
	}

	function _cancel(anim){
		if(anim._requestID){
			window.cancelRequestAnimationFrame(anim._requestID);
			anim._requestID = 0;
		}		
	}

	function _play(anim, begin, end, forceSync){
		if(!anim._requestID){
			if(null == begin) begin = 0;
			if(null == end) end = 1;
			
			var animate = function(time){
				var per = Math.min(1.0, (time - anim._timeStamp) / anim.dur);
				_request(anim, per);
				anim.fire('enterframe');
				if(per >= end){
					_cancel(anim);
					anim.fire('end');
				}else{	
					anim._requestID = window.requestAnimationFrame(animate);
				}
			};

			_request(anim, begin);
			if(forceSync) animate(new Date()); //强制同步执行，只用在cancel/reset的时候
			else
				anim._requestID = window.requestAnimationFrame(animate);	
		}
	}

	mix(Anim.prototype, {
		start : function(){
			_cancel(this);
			this.fire('beforestart');
			_play(this);
			return true;
		},
		reset : function(){ //结束并回到初始状态
			_cancel(this);
			//_request(this, 0);
			_play(this, 0, 0, true);
			this.fire('reset');
			return true;
		},
		pause : function(){
			if(this._requestID){
				_cancel(this);
				this.fire('pause');
				return true;
			}
			return false;
		},
		resume : function(){
			if(!this._requestID && this.per && this.per < 1){
				this.fire('resume');
				_play(this, this.per);
				return true;
			}
			return false;
		},
		cancel : function(){ //手工结束动画，会触发end事件
			this.resume();		//有可能被pause，所以要resume先
			if(this._requestID){
				_cancel(this);
				_play(this, 1,1,true);
				return true;
			}
			return false;
		}
	});

	QW.provide('Anim', Anim);
})();/*import from ../components/animation/anim.el.js,(by build.py)*/

(function() {	
	var Anim = QW.Anim,
		extend = QW.ClassH.extend,
		g = QW.NodeH.g,
		mix = QW.ObjectH.mix,
		isElement = QW.DomU.isElement,
		setStyle = QW.NodeH.setStyle,
		getStyle = QW.NodeH.getCurrentStyle,
		map = Array.map || QW.ArrayH.map;
	
	function AnimAgent(el, opts, attr){ //用来辅助对opts进行标准化操作的私有类
		this.el = el;
		this.attr = attr;
		mix(this, opts[attr]);
		this.init();
	}

	mix(AnimAgent.prototype, { 
		setValue : function(value){   //获得属性
			setStyle(this.el, this.attr, value);
		},
		getValue : function(){
			return getStyle(this.el, this.attr);
		},
		getUnits : function(attr){
			if(this.units) return this.units;
			
			var value = this.getValue();
			if(value)
				return value.toString().replace(/^[+-]?[\d\.]+/g,'');
			return '';
		},
		init : function(){ //初始化数据
			var from, to, by, units;
			if(null != this.from){
				from = parseFloat(this.from);			
			}else{
				from = parseFloat(this.getValue());
			}

			to = parseFloat(this.to);
			by = this.by != null ? parseFloat(this.by) : (to - from);	

			this.from = from;
			this.by = by;
			this.units = this.getUnits();
		},
		action : function(per, easing){
			var units = this.units;
			var value = this.from + easing(per , this.by);
			//console.log([this.from, per, this.by, value, easing(per , this.by)]);
			value = value.toFixed(6);
			this.setValue(value + units);
		}
	});

	var RectAgent = extend(function(){
		RectAgent.$super.apply(this, arguments);
	},AnimAgent);

	mix(RectAgent.prototype, {
		getUnits : function(attr){
			if(this.units) return this.units;
			
			var value = this.getValue();
			if(value)
				return value.toString().replace(/^[+-]?[\d\.]+/g,'');
			return 'px';
		}	
	}, true);

	var ScrollAgent = extend(
		function(){
			ScrollAgent.$super.apply(this, arguments);
	},AnimAgent);

	mix(ScrollAgent.prototype, {
		getValue : function() {
			return this.el[this.attr] | 0;
		},
		setValue : function(value) {
			this.el[this.attr] = Math.round(value);
		}
	}, true);

	var ColorAgent = extend(function(){
		ColorAgent.$super.apply(this,arguments);
	}, AnimAgent);

	mix(ColorAgent.prototype, {
		/**
		 * 处理颜色
		 * 
		 * @method parseColor
		 * @public
		 * @param {string} 颜色值，支持三种形式：#000/#000000/rgb(0,0,0)
		 * @return {array} 包含r、g、b的数组
		 */
		parseColor : function(s){
			/**
			 * ColorAnim用到的一些正则
			 * 
			 * @public
			 */
			var patterns = {
				rgb         : /^rgb\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\)$/i,
				hex         : /^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i,
				hex3        : /^#?([0-9A-F]{1})([0-9A-F]{1})([0-9A-F]{1})$/i
			};

			if (s.length == 3) { return s; }
			
			var c = patterns.hex.exec(s);
			
			if (c && c.length == 4) {
				return [ parseInt(c[1], 16), parseInt(c[2], 16), parseInt(c[3], 16) ];
			}
		
			c = patterns.rgb.exec(s);
			if (c && c.length == 4) {
				return [ parseInt(c[1], 10), parseInt(c[2], 10), parseInt(c[3], 10) ];
			}
		
			c = patterns.hex3.exec(s);
			if (c && c.length == 4) {
				return [ parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16) ];
			}
			
			return [0, 0, 0];
		},
		/**
		 * 初始化数据
		 * 
		 * @method initData
		 * @public
		 * @return void
		 */
		init : function(){
			var from, to, by, units;
			var parseColor = this.parseColor;

			if(null != this.from){
				from = this.from;			
			}else{
				from = this.getValue();
			}

			from = parseColor(from);

			to = this.to || [0,0,0];
			to = parseColor(to);

			by = this.by ? parseColor(this.by) : 
				map(to, function(d,i){
					return d - from[i];
				});

			this.from = from;
			this.by = by;
			this.units = this.getUnits();
		},

		/**
		 * 获取CSS颜色
		 * 
		 * @method setAttr
		 * @public
		 * @param {string} 属性名
		 * @return {string} 颜色值
		 */
		getValue : function() {
			return getStyle(this.el, this.attr);
		},

		/**
		 * 设置CSS颜色
		 * 
		 * @method setAttr
		 * @public
		 * @param {string} 属性名
		 * @param {string} 值
		 * @return void
		 */
		setValue : function(value) {
			if(typeof value == "string") {
				setStyle(this.el, this.attr, value);
			} else {
				setStyle(this.el, this.attr, "rgb("+value.join(",")+")");
			}
		},
		action : function(per, easing){
			var me = this;
			var value = this.from.map(function(s, i){
				return Math.max(Math.floor(s + easing(per, me.by[i])),0);
			});
			this.setValue(value);
		}
	}, true);

	/*
	 * 相关的数据处理器，返回处理器
	 */
	var _agentPattern = { 
		"color" : ColorAgent, 
		"scroll" : ScrollAgent,
		"width|height|top$|bottom$|left$|right$" : RectAgent,
		".*" : AnimAgent
	};

	function _patternFilter(patternTable, key){
		for(var i in patternTable){
			var pattern = new RegExp(i, "i");
			if(pattern.test(key)){
				return patternTable[i];
			}
		}	
		return null;
	};

	function _setAgent(el, opts){
		for(var attr in opts){
			var Agent = _patternFilter(_agentPattern, attr);
			opts[attr].agent = new Agent(el, opts, attr);
		}		
	}

	function _makeAction(el, opts, /*default easing*/ easing){
		return function(per){
			for(var attr in opts){
				var agent = opts[attr].agent;
				easing = agent.easing || easing;
				agent.action(per, easing);
			}
		}
	}
	
	var ElAnim = extend(
		function(el, opts, dur, easing){
			el = g(el);

			if(!isElement(el)) 
				throw new Error(['Animation','Initialize Error','Element Not Found!']);

			easing = easing || function(p, d) {return d * p};		
			
			_setAgent(el, opts);
			var action = _makeAction(el, opts, easing);
			
			ElAnim.$super.call(this, action, dur);
		},Anim);

	QW.provide("ElAnim", ElAnim);
})();/*import from ../components/animation/anim.easing.js,(by build.py)*/

/*
 *	Copyright (c) 2009, Baidu Inc. All rights reserved.
 *	http://www.youa.com
 *	version: $version$ $release$ released
 *	author: quguangyu@baidu.com
*/

 (function() {
	var Easing  = {
		
		easeNone: function(p,d) {
			return d*p;
		},
		easeIn: function(p,d) {
			return d*p*p;
		},
		easeOut: function(p,d) {
			return -d*p*(p-2);
		},
		easeBoth: function(p,d) {
			if((p/=0.5)<1)return d/2*p*p;
			return -d/2*((--p)*(p-2)-1);
		},
		easeInStrong: function(p,d) {
			return d*p*p*p*p;
		},
		easeOutStrong: function(p,d) {
			return -d*((p-=1)*p*p*p-1);
		},
		easeBothStrong: function(p,d) {
			if((p/=0.5)<1)return d/2*p*p*p*p;
			return -d/2*((p-=2)*p*p*p-2);
		},
		elasticIn: function(p,d) {
			if(p==0)return 0;
			if(p==1)return d;
			var x=d*.3,y=d,z=x/4;
			return -(y*Math.pow(2,10*(p-=1))*Math.sin((p*d-z)*(2*Math.PI)/x));
		},
		elasticOut: function(p,d) {
			if(p==0)return 0;
			if(p==1)return d;
			var x=d*.3,y=d,z=x/4;
			return y*Math.pow(2,-10*p)*Math.sin((p*d-z)*(2*Math.PI)/x)+d;
		},
		elasticBoth: function(p,d) {
			if(p==0)return 0;
			if ((p/=0.5)==2)return d;
			var x=.3*1.5,y=d,z=x/4;
			if(p<1)return -.5*(y*Math.pow(2,10*(p-=1))*Math.sin((p-z)*(2*Math.PI)/x));
			return y*Math.pow(2,-10*(p-=1))*Math.sin((p-z)*(2*Math.PI)/x )*.5+d;
		},
		backIn: function(p,d) {
			var s=1.70158;
			return d*p*p*((s+1)*p-s);
		},
		backOut: function(p,d) {
			var s=1.70158;
			return d*((p=p-1)*p*((s+1)*p+s)+1);
		},
		backBoth: function(p,d) {
			var s=1.70158;
			if((p/=0.5)<1)return d/2*(p*p*(((s*=(1.525))+1)*p-s));
			return d/2*((p-=2)*p*(((s*=(1.525))+1)*p+s)+2);
		},
		bounceIn: function(p,d) {
			return d-Easing.bounceOut(1-p,d);
		},
		bounceOut: function(p,d) {
			if(p<(1/2.75)) {
				return d*(7.5625*p*p);
			}else if(p<(2/2.75)) {
				return d*(7.5625*(p-=(1.5/2.75))*p + .75);
			}else if(p<(2.5/2.75)) {
				return d*(7.5625*(p-=(2.25/2.75))*p + .9375);
			}
			return d*(7.5625*(p-=(2.625/2.75))*p + .984375);
		},
		bounceBoth: function(p,d) {
			if(p<0.5)return Anim.Easing.bounceIn(p*2,d)*.5;
			return Easing.bounceOut(p*2-1,d)*.5 + d*.5;
		}
	};

	QW.ElAnim.Easing = Easing;
 })();/*import from ../components/animation/anim_retouch.js,(by build.py)*/

(function() {
	var QW = window.QW, 
		mix = QW.ObjectH.mix, 
		HH = QW.HelperH, 
		W = QW.W,
		Dom = QW.Dom,
		Anim = QW.ElAnim;

	var AnimElH = (function(){
		return {
			fadeIn : function(el, dur, callback) {
				var anim = new Anim(el, {		
					"opacity" : {
						from  : 0,
						to    : 1
					}
				}, dur);
				
				W(el).show();
				if(callback) anim.on("end", callback);
				anim.start();
			},
			fadeOut : function(el, dur, callback) {
				var anim = new Anim(el, {
					"opacity" : {
						from  : 1,
						to    : 0
					}
				}, dur);

				anim.on("end", function(){
					W(el).hide(); 
				});
				if(callback) anim.on("end", callback);
				anim.start();
			},
			/* 淡入/淡出切换 */
			/*fadeToggle: function(el, dur, callback) {
				AnimElH[el.offsetHeight ? 'fadeOut' : 'fadeIn'](el, dur, callback);
			},*/
			slideUp : function(el, dur, callback) {
				el = W(el);
				var height = el.get('offsetHeight'),
					css_height = el.getStyle('height');

				el.attr('data--height', height);
				el.setStyle('overflow', 'hidden');

				var anim = new Anim(el, {
					"height" : {
						from : height,
						to  : 0
					}
				}, dur);

				anim.on("end", function(){
					el.hide();
					if( !css_height ) { el.removeStyle('height'); }
					el.setStyle('overflow', '');
				});
				if(callback) anim.on("end", callback);
				anim.start();
			},
			slideDown : function(el, dur, callback) {
				el = W(el);
				el.show();
				var height = el.get('offsetHeight') || el.attr('data--height'),
					css_height = el.getStyle('height');

				el.setStyle('overflow', 'hidden');

				var anim = new Anim(el, {
					"height" : {
						from : 0,
						to : height
					}
				}, dur);
				anim.on("end", function(){
					el.setStyle('overflow', '');
					if( !css_height ) { el.removeStyle('height'); }
				});

				if(callback) anim.on("end", callback);
			
				anim.start();
			},
			/*function(el, dur, callback) {
				AnimElH[el.offsetHeight ? 'slideUp' : 'slideDown'](el, dur, callback);
			},*/
			shine4Error : function(el, dur, callback) {			
				var anim = new Anim(el, {
					"backgroundColor" : {
						from : "#f33",
						to	 : "#fff"
					}
				}, dur);

				anim.on("end", function(){
					W(el).setStyle("backgroundColor", "");
				});
				if(callback) anim.on("end", callback);
				anim.start();
			},
			/**
			 * Animate a HTML element or SVG element wrapper
			 * @param {Object} el
			 * @param {Object} params
			 * @param {Object} options jQuery-like animation options: duration, easing, callback
			 */
			animate : function (el, params, options) {
				AnimElH.stop(el);

				var dur = options.duration;
				var easing = options.easing;
				var callback = options.callback;

				var anim = new Anim(el, params, dur, easing);

				anim.on("end", callback);
				
				el.__animator = anim;

				anim.start();
			},
			stop : function (el){
				if(el.__animator){
					el.__animator.cancel();
					el.__animator = null;
				}
			}
		};
	})();

	//过程抽象，比数据抽象更严谨，也有不好的地方，是只能从slideUp/fadeOut开始
	mix(AnimElH, {
		slideToggle: QW.FunctionH.toggle(AnimElH.slideUp, AnimElH.slideDown), 
		fadeToggle: QW.FunctionH.toggle(AnimElH.fadeOut, AnimElH.fadeIn)
	});

	QW.NodeW.pluginHelper(AnimElH, 'operator');
	if (QW.Dom) {
		mix(QW.Dom, AnimElH);
	}
})();