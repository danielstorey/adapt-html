define(function(require) {

	var ComponentView = require('coreViews/componentView');
	var ButtonView = require("coreViews/buttonsView");
	var Adapt = require('coreJS/adapt');

	var HTML = ComponentView.extend({

		events: {
			"click .btn-html-trickle": "advanceStage",
			"click .clickme": "clickmeNext"
		},

		preRender: function() {
			// Checks to see if the text should be reset on revisit
			this.checkIfResetOnRevisit();
		},

		render: function() {

			var data = this.model.toJSON();
			var templateMain = Handlebars.templates["html"];
			this.$el.html(templateMain(data));

			var tplName = this.model.get("_template");
			var template = Handlebars.templates[tplName];
			if (template) {
				var $rendered = $(template(data));
				var $stages = $rendered.find(".trickle-item");
				var $clickmeItems = $rendered.find(".clickme-item");
				var isComplete = this.model.get("_isComplete");

				if (!isComplete && $stages.length) {
					this.loadTrickle($rendered, $stages)
				} else if (!isComplete && $clickmeItems.length) {
					this.loadClickMe($rendered, $clickmeItems);
				} else {
					$stages.removeClass("html-stage");
				}


				var $container = this.$(".component-inner");
				$container.append($rendered);
			}

			this.postRender();
		},

		postRender: function() {
			this.setReadyStatus();


			if (this.model.get("_isClickme")) {
				setTimeout(function() {
					this.$(".clickme").offset(this.$(".clickme-item").eq(0).offset());
				}.bind(this), 0);
			}

			// Load script if present

			this.$el.on("complete", _.bind(this.onCompleted, this));

			//Check if complete
			if (this.model.get("_isComplete")) {
				this.$el.addClass("complete");
			}

			if (this.model.get("_scripts")) {
				_.each(this.model.get("_scripts"), function(fileName) {

					var script = document.createElement("script");
					script.src = "course/en/scripts/" + fileName;
					document.head.appendChild(script);
				}, this);
			}

			if (!this.model.get("_isClickme") && !this.model.get("_isTrickle")) {
				this.$el.on('inview', _.bind(this.inview, this));
			}
		},

		loadTrickle: function($el, $stages) {
			this.model.set("stage", 0);
			this.model.set("numStages", $stages.length);
			this.model.set("_isTrickle", true);
			$stages.addClass("trickle-item-hidden");
			$el.append("<div class='html-button'><button class='btn btn-html-trickle'>Continue</button></div>");
		},

		loadClickMe: function($el, $clickmeItems) {
			this.model.set("_isClickme", true);
			this.model.set("stage", 0);
			this.model.set("numStages", $clickmeItems.length);
			$clickmeItems.addClass("clickme-item-hidden");

			var clickme = document.createElement("a");
			clickme.className = "clickme";
			$el.append(clickme);
		},

		advanceStage: function() {
			var stage = this.model.get("stage");
			var $el = this.$(".trickle-item").eq(stage);
			$el.reveal();

			if (stage === 0) {
				var h = this.$(".btn-html-trickle").outerHeight();
				console.log(h);
				this.$(".html-button").height(h);
			}

			if (stage + 1 === this.model.get("numStages")) {
				this.onCompleted();
				setTimeout(function() {
					this.$(".html-button").height(0);
				}.bind(this), 200);
			} else {
				this.model.set("stage", stage + 1);
			}
		},

		clickmeNext: function() {
			var stage = this.model.get("stage");
			var $items = this.$(".clickme-item");
			var $clickme = this.$(".clickme");
			$items.eq(stage).removeClass("clickme-item-hidden");
			if (stage + 1 === this.model.get("numStages")) {
				this.onCompleted();
				var offset = this.$el.offset();
				offset.left += (this.$el.outerWidth() / 2) - ($clickme.outerWidth() / 2);
				offset.top += this.$el.outerHeight() - ($clickme.outerHeight() / 2);
				$clickme.offset(offset);
				$clickme.addClass("complete");
				setTimeout(function() {
					clearInterval(this.clickmeInterval);
				}.bind(this), 250);
			} else {
				stage ++;
				var $el = $items.eq(stage);
				$clickme.offset($el.offset());
				$el.scrollToThis();
				this.model.set("stage", stage);
			}
		},

		onCompleted: function() {
			this.$(".component-inner").parent().addClass("complete");
			this.setCompletionStatus();
		},

		// Used to check if the text should reset on revisit
		checkIfResetOnRevisit: function() {
			var isResetOnRevisit = this.model.get('_isResetOnRevisit');

			// If reset is enabled set defaults
			if (isResetOnRevisit) {
				this.model.reset(isResetOnRevisit);
			}
		},

		inview: function(event, visible, visiblePartX, visiblePartY) {
			if (visible) {
				if (visiblePartY === 'top') {
					this._isVisibleTop = true;
				} else if (visiblePartY === 'bottom') {
					this._isVisibleBottom = true;
				} else {
					this._isVisibleTop = true;
					this._isVisibleBottom = true;
				}

				if (this._isVisibleTop && this._isVisibleBottom) {
					this.$(this.model.get('cssSelector')).off('inview');
					this.setCompletionStatus();
				}
			}
		}

	});

	Adapt.register('html', HTML);

	return HTML;

});

$.fn.extend({
	reveal: function() {
		var $children = this.children();
		var h = 0;
		_.each($children, function (el) {
			h += $(el).outerHeight(true);
		});
		var isBlockslider = this.parents(".blockslider").length > 0;
		if (isBlockslider) {
			var $elScroll = this.parents(".block");
			var st = $elScroll.scrollTop();
		} else {
			var $elScroll = $("body, html");
			var st = $elScroll.eq(0).scrollTop();
			if (!st) st = $elScroll.eq(1).scrollTop();
		}
		var top = this.offset().top;
		var winHeight = $(window).height();
		if (st + winHeight - 100 < top + h) $elScroll.animate({scrollTop: "+=" + h});
		this.height(h).trigger("reveal");
		setTimeout(function() {
			this.height("auto");
		}.bind(this), 500);
		return this;
	},
	textScroller: function() {
		var $el = this;
		var el = this[0];
		var text = el.innerHTML;
		var currText = "";
		var remainingText = text;
		var i = 0;
		var pause = false;
		var scroller = setInterval(function() {
			if (pause) return;
			currText += text[i];
			remainingText = text.substring(i + 1, text.length);
			el.innerHTML = currText + "<span style='opacity:0'>" + remainingText + "</span>";
			if (i === 0) $el.removeClass("textscroller");
			if (text[i] === ".") {
				pause = true;
				setTimeout(function() {
					pause = false;
				}, 1000)
			}

			i++;

			if (i === text.length) {
				clearInterval(scroller);
				nextAnimation();
			}
		}, 20);
	},
	stepFade: function(t, shuffle, callback) {
		t = t || 80;
		var $collection = shuffle ? _.shuffle(this): this;
		for (var i = 0; i < $collection.length; i++) {
			(function (i) {
				setTimeout(function () {
					$collection[i].style.opacity = 1;
					if (i + 1 === images.length && callback) callback();
				}, i * t);
			})(i);
		}
	},
	centre: function() {
		var parent = this.parent();
		this.css({
			left: (parent.outerWidth() / 2) - (this.outerWidth() / 2),
			top: (parent.outerHeight() / 2) - (this.outerHeight() / 2)
		});
		return this;
	},
	scrollToThis: function() {
		var isBlockslider = this.parents(".blockslider").length > 0;
		var $elScroll, st;
		if (isBlockslider) {
			$elScroll = this.parents(".block");
			st = $elScroll.scrollTop();
		} else {
			st = 0;
			$elScroll = $("html, body");
			_.each($elScroll, function(el) {
				st += $(el).scrollTop();
			});
		}

		var top = this.offset().top - 80;
		var winHeight = $(window).outerHeight();

		if (top < st) $elScroll.animate({scrollTop: top - 80});
		if (top > st + winHeight - 220) $elScroll.animate({scrollTop: top - winHeight + 220});
	}

});
