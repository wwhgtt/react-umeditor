'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var React = require('react');
var ReactDOM = require('react-dom');

var _require = require('./constants/EditorConstants');

var EditorIconTypes = _require.EditorIconTypes;

// utlils
var EditorHistory = require('./utils/EditorHistory');
var EditorSelection = require('./utils/EditorSelection');
var EditorDOM = require('./utils/EditorDOM');
var EditorResize = require('./utils/EditorResize.react');
var EditorTimer = require('./utils/EditorTimer');
var EditorEventEmitter = require('./utils/EditorEventEmitter');
// dialog & dropdown
var ColorDropdown = require('./components/plugins/ColorDropdown.react');
var FormulaDropdown = require('./components/plugins/FormulaDropdown.react');
var TablePickerDropdown = require('./components/plugins/TablePickerDropdown.react');
// combobox
var FontSizeComboBox = require('./components/plugins/FontSizeComboBox.react');
var FontFamilyComboBox = require('./components/plugins/FontFamilyComboBox.react');
var ParagraphComboBox = require('./components/plugins/ParagraphComboBox.react');
// dialog
var EmotionDialog = require('./components/plugins/EmotionDialog.react');
var SpecialCharsDialog = require('./components/plugins/SpecialCharsDialog.react');
var ImageDialog = require('./components/plugins/ImageDialog.react');

// base components
var EditorToolbar = require('./components/core/EditorToolbar.react');
var EditorTextArea = require('./components/core/EditorTextArea.react');
var EditorContentEditableDiv = require('./components/core/EditorContentEditableDiv.react');

// 需要外部引用MathQuill
var MQ = MathQuill ? MathQuill.getInterface(2) : null;

// key down context
var saveSceneTimer = null;
var maxInputCount = 20;
var lastKeyCode = null;
var keycont = 0;

if (!Date.prototype.Format) {
	Date.prototype.Format = function (n) {
		var i = {
			"M+": this.getMonth() + 1,
			"d+": this.getDate(),
			"h+": this.getHours(),
			"m+": this.getMinutes(),
			"s+": this.getSeconds(),
			"q+": Math.floor((this.getMonth() + 3) / 3),
			S: this.getMilliseconds()
		},
		    t;
		/(y+)/.test(n) && (n = n.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length)));
		for (t in i) new RegExp("(" + t + ")").test(n) && (n = n.replace(RegExp.$1, RegExp.$1.length == 1 ? i[t] : ("00" + i[t]).substr(("" + i[t]).length)));
		return n;
	};
}

/**
* 对外接口方法
* @findDOMNode: 获取"root","editarea","toolbar","color"的ref对象以及相应的dom对象
* @setContent: 设置html格式数据
* @getContent: 获取html格式数据
* @onFocus: 监听focus事件
* @focusEditor: 聚焦到Editor上
* @defaultValue: 默认内容
* @value: 编辑器的值
* @icons: 工具条上需要显示的图标
**/

var Editor = React.createClass({
	displayName: 'Editor',

	// init & update
	getInitialState: function getInitialState() {
		return {
			editorState: {
				showHtml: false,
				icons: {
					"forecolor": { color: 'transparent', icon: "forecolor" },
					"backcolor": { color: 'transparent', icon: "backcolor" },
					"fontsize": { value: "3", icon: "fontsize" },
					"paragraph": { value: "p", icon: "fontsize" },
					"fontfamily": { value: "宋体, SimSun", icon: "fontfamily" },
					"indent": { active: false, icon: "indent" },
					"outdent": { active: true, icon: "outdent" }
				}
			},
			defaultValue: this.props.defaultValue ? this.props.defaultValue : "<p>This is an Editor</p>",
			value: this.props.value
		};
	},
	propTypes: {
		"plugins": React.PropTypes.object,
		"fontFamily": React.PropTypes.array,
		"fontSize": React.PropTypes.array,
		"paragraph": React.PropTypes.array
	},
	getDefaultProps: function getDefaultProps() {
		return {
			"plugins": {
				"image": {
					"uploader": {
						type: "default", // qiniu
						name: "file",
						url: "/upload",
						qiniu: {
							app: {
								Bucket: "qtestbucket",
								AK: "iN7NgwM31j4-BZacMjPrOQBs34UG1maYCAQmhdCV",
								SK: "6QTOr2Jg1gcZEWDQXKOGZh5PziC2MCV5KsntT70j"
							},
							key: null,
							upload_token: null,
							domain: "http://o9sa2vijj.bkt.clouddn.com",
							genKey: function genKey(options) {
								return options.file.type + "-" + options.file.size + "-" + options.file.lastModifiedDate.valueOf() + "-" + new Date().valueOf() + "-" + options.file.name;
							}
						}
					}
				}
			},
			"fontFamily": [{ "name": "宋体", value: "宋体, SimSun", defualt: true }, { "name": "隶书", value: "隶书, SimLi" }, { "name": "楷体", value: "楷体, SimKai" }, { "name": "微软雅黑", value: "微软雅黑, Microsoft YaHei" }, { "name": "黑体", value: "黑体, SimHei" }, { "name": "arial", value: "arial, helvetica, sans-serif" }, { "name": "arial black", value: "arial black, avant garde" }, { "name": "omic sans ms", value: "omic sans ms" }, { "name": "impact", value: "impact, chicago" }, { "name": "times new roman", value: "times new roman" }, { "name": "andale mono", value: "andale mono" }],
			"fontSize": [{ "name": "10px", value: "1" }, { "name": "12px", value: "2" }, { "name": "16px", value: "3", defualt: true }, { "name": "18px", value: "4" }, { "name": "24px", value: "5" }, { "name": "32px", value: "6" }, { "name": "38px", value: "7" }],
			"paragraph": [{ "name": "段落", value: "p", defualt: true }, { "name": "标题1", value: "h1" }, { "name": "标题2", value: "h2" }, { "name": "标题3", value: "h3" }, { "name": "标题4", value: "h4" }, { "name": "标题5", value: "h5" }, { "name": "标题6", value: "h6" }],
			"icons": [
			// video map print preview drafts link unlink
			"source | undo redo | bold italic underline strikethrough fontborder | ", "paragraph fontfamily fontsize | superscript subscript | ", "forecolor backcolor | removeformat | insertorderedlist insertunorderedlist | selectall | ", "cleardoc  | indent outdent | justifyleft justifycenter justifyright | touppercase tolowercase | ", "horizontal date time  | image emotion formula spechars | inserttable"]
		};
	},
	componentDidMount: function componentDidMount() {
		EditorHistory.clear();
		this.setContent(this.state.value ? this.state.value : this.state.defaultValue);
		var editarea = ReactDOM.findDOMNode(this.refs.editarea);
		var isCollapsed = true;
		editarea.addEventListener('keydown', this.handleKeyDown);
		editarea.addEventListener('keyup', this.handleKeyUp);
		var onEditorMount = this.props.onEditorMount;
		setTimeout(onEditorMount, 10);
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		// update value
		if (this.props.value != nextProps.value) {
			this.setContent(nextProps.value ? nextProps.value : nextProps.defaultValue);
		}
	},
	componentDidUpdate: function componentDidUpdate() {
		var editorState = this.state.editorState;
		switch (editorState.icon) {
			case "source":
				this.setContent(editorState.content);
				break;
			case "cleardoc":
				this.setContent(editorState.content);
				break;
		}
	},
	componentWillUnmont: function componentWillUnmont() {
		var editarea = ReactDOM.findDOMNode(this.refs.editarea);
		editarea.removeEventListener('keydown', this.handleKeyDown);
		editarea.removeEventListener('keyup', this.handleKeyUp);
	},
	// event handler
	handleKeyDown: function handleKeyDown(evt) {
		evt = evt || event;
		var target = evt.target || evt.srcElement;
		if (target.className && target.className.indexOf('editor-contenteditable-div') != -1) {
			var keyCode = evt.keyCode || evt.which;
			var autoSave = this.autoSave;
			if (!evt.ctrlKey && !evt.metaKey && !evt.shiftKey && !evt.altKey) {
				if (EditorHistory.getCommandStack().length == 0) {
					autoSave();
					keycont = 0;
				}
				clearTimeout(saveSceneTimer);
				saveSceneTimer = EditorTimer.setTimeout(function () {
					var interalTimer = EditorTimer.setInterval(function () {
						autoSave();
						keycont = 0;
						EditorTimer.clearInterval(interalTimer);
					}, 300);
				}, 200);
				lastKeyCode = keyCode;
				keycont++;
				if (keycont >= maxInputCount) {
					autoSave();
					keycont = 0;
				}
			}
		}
		EditorDOM.stopPropagation(evt);
	},
	handleKeyUp: function handleKeyUp(evt) {
		evt = evt || event;
		var target = evt.target || evt.srcElement;
		if (target.className && target.className.indexOf('editor-contenteditable-div') != -1) {
			var keyCode = evt.keyCode || evt.which;
			if (!evt.ctrlKey && !evt.metaKey && !evt.shiftKey && !evt.altKey) {
				// some handle
			}
		}
		EditorDOM.stopPropagation(evt);
	},
	handleFocus: function handleFocus(e) {
		if (this.props.onFocus) {
			this.props.onFocus(e, this.findDOMNode('root'));
		}
		EditorDOM.stopPropagation(e);
	},
	handleClick: function handleClick(e) {
		EditorDOM.stopPropagation(e);
	},
	exchangeRangeState: function exchangeRangeState(editorState) {
		var rangeState = EditorSelection.getRangeState();
		for (var icon in rangeState) {
			if (!editorState.icons[icon]) editorState.icons[icon] = rangeState[icon];else {
				switch (icon) {
					case "forecolor":
					case "backcolor":
						editorState.icons[icon].color = rangeState[icon].color;
						break;
					case "paragraph":
					case "fontfamily":
					case "fontsize":
						editorState.icons[icon].value = rangeState[icon].value;
						break;
				}
				editorState.icons[icon].active = rangeState[icon].active;
			}
		}
		return editorState;
	},
	handleRangeChange: function handleRangeChange(e) {
		e = e || event;
		if (e && e.type == "blur") return;
		var target = e ? e.target || e.srcElement : null;
		var selection = EditorSelection.getSelection();
		if (selection && selection.rangeCount > 0) {
			var editorState = this.state.editorState;
			editorState = this.exchangeRangeState(editorState);
			this.setState({
				editorState: editorState
			});
			this.refs.resize.clearTarget();
		} else if (target) {
			var tagName = target.tagName.toUpperCase();
			switch (tagName) {
				case "IMG":
					this.refs.resize.setTarget(target);
					break;
			}
		}
	},
	handleToolbarIconClick: function handleToolbarIconClick(e, state) {
		e = e || event;
		var target = e.target || e.srcElement;
		var offsetPosition = this.getOffsetRootParentPosition(target);

		var handleRangeChange = this.handleRangeChange;
		var editarea = ReactDOM.findDOMNode(this.refs.editarea);
		var editorState = this.state.editorState;
		EditorSelection.cloneRange();
		switch (state.icon) {
			case "source":
				editorState.showHtml = !editorState.showHtml;
				state.active = editorState.showHtml;
				editorState.content = this.refs.editarea.getContent();
				break;
			case "undo":
				EditorHistory.undo();
				break;
			case "redo":
				EditorHistory.redo();
				break;
			case "removeformat":
				EditorHistory.execCommand(state.icon, false, null);
				EditorSelection.storeRange();
				var spanNodes = EditorSelection.getSpanNodes();
				for (var i = 0; i < spanNodes.length; i++) {
					switch (spanNodes[i].className) {
						case "font-border":
							var spanNode = spanNodes[i];
							var parentNode = spanNode.parentNode;
							var nextSibling = spanNode.nextSibling;

							for (var c = 0; c < spanNode.childNodes.length; c++) {
								parentNode.insertBefore(spanNode.childNodes[c].cloneNode(), nextSibling);
							}
							parentNode.removeChild(spanNodes[i]);
							break;
					}
				}
				EditorSelection.restoreRange();
				break;
			case "bold":
			case "italic":
			case "underline":
			case "strikethrough":
			case "subscript":
			case "superscript":
			case "insertorderedlist":
			case "insertunorderedlist":
			case "selectall":
			case "justifyleft":
			case "justifyright":
			case "justifycenter":
			case "indent":
			case "outdent":
				EditorHistory.execCommand(state.icon, false, null);
				break;
			case "touppercase":
			case "tolowercase":
				EditorSelection.storeRange();
				var textNodes = EditorSelection.getTextNodes();
				for (var i = 0; i < textNodes.length; i++) {
					var node = textNodes[i].childNode;
					var start = textNodes[i].startOffset;
					var end = textNodes[i].endOffset;
					node.nodeValue = node.nodeValue.substring(0, start) + (state.icon == "touppercase" ? node.nodeValue.substring(start, end).toUpperCase() : node.nodeValue.substring(start, end).toLowerCase()) + node.nodeValue.substring(end, node.length);
				}
				EditorHistory.execCommand(state.icon, false, null);
				EditorSelection.restoreRange();
				break;
			case "fontborder":
				var textNodes = EditorSelection.getTextNodes();
				var startNode = null,
				    endNode = null,
				    startOffset = 0,
				    endOffset = 0;
				for (var i = 0; i < textNodes.length; i++) {
					// 获取
					var node = textNodes[i].childNode;
					var start = textNodes[i].startOffset;
					var end = textNodes[i].endOffset;
					// 拷贝
					var cloneNode = node.cloneNode();
					var startText = cloneNode.nodeValue.substring(0, start);
					var endText = cloneNode.nodeValue.substring(end, cloneNode.length);
					var borderText = cloneNode.nodeValue.substring(start, end);
					var span = null;
					var textParentNode = textNodes[i].childNode.parentNode;
					if (textParentNode && textParentNode.className && textParentNode.className == "font-border") {
						if (i == 0) {
							startNode = textNodes[i].childNode;
							startOffset = start;
						}
						if (i == textNodes.length - 1) {
							endNode = textNodes[i].childNode;
							endOffset = end;
						}
					} else {
						// 重新赋值
						node.nodeValue = startText;
						span = document.createElement("span");
						span.className = "font-border";
						span.innerHTML = borderText;
						span.style.border = "1px solid #000";
						node.parentNode.insertBefore(span, node.nextSibling);
						if (endText != "") {
							node.parentNode.insertBefore(document.createTextNode(endText), span.nextSibling);
						}
						if (i == 0) startNode = span.childNodes[0];
						if (i == textNodes.length - 1) {
							endNode = span.childNodes[0];
							endOffset = span.childNodes[0].length;
						}
					}
				}
				EditorSelection.addRange(startNode, startOffset, endNode, endOffset);
				// 合并相同font-border元素
				var spanNodes = EditorSelection.getSpanNodes();
				for (var i = 0; i < spanNodes.length - 1; i++) {
					var spanNode = spanNodes[i];
					var parentNode = spanNodes[i].parentNode;

					if (EditorDOM.isNullOfTextNode(spanNode.nextSibling)) {
						// 移除空元素
						parentNode.removeChild(spanNode.nextSibling);
					}
					if (spanNode.nextSibling === spanNodes[i + 1]) {
						var nextSiblingChildNodes = spanNodes[i + 1].childNodes;
						for (var c = 0; c < nextSiblingChildNodes.length; c++) {
							spanNode.appendChild(nextSiblingChildNodes[c].cloneNode());
						}
						// 移除老元素
						parentNode.removeChild(spanNodes[i + 1]);
						// 删除过后，重新指向
						spanNodes[i + 1] = spanNodes[i];
					}
				}
				EditorHistory.execCommand(state.icon, false, null);
				break;
			case "forecolor":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;
				this.refs.color.open(offsetPosition, function (e, color) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('forecolor', false, color);
					handleRangeChange();
				});
				break;
			case "backcolor":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;

				this.refs.color.open(offsetPosition, function (e, color) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('backcolor', false, color);
					handleRangeChange();
				});
				break;
			case "fontsize":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;

				this.refs.fontsize.open(offsetPosition, function (e, fontsize) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('fontsize', false, fontsize);
					handleRangeChange();
				});
				break;
			case "fontfamily":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;

				this.refs.fontfamily.open(offsetPosition, function (e, fontfamily) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('fontname', false, fontfamily);
					handleRangeChange();
				});
				break;
			case "paragraph":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;

				this.refs.paragraph.open(offsetPosition, function (e, paragraph) {
					editarea.focus();
					EditorSelection.restoreRange();
					var paragraphs = EditorSelection.getParagraphs();
					for (var i = 0; i < paragraphs.length; i++) {
						switch (paragraphs[i].tagName.toUpperCase()) {
							case "TD":
							case "TH":
							case "DIV":
								var childNodes = paragraphs[i].childNodes;
								var paraElement = document.createElement(paragraph);
								for (var j = 0; j < childNodes.length; j++) {
									paraElement.appendChild(childNodes[j]);
								}
								paragraphs[i].appendChild(paraElement);
								break;
							case "P":
							case "H1":
							case "H2":
							case "H3":
							case "H4":
							case "H5":
							case "H6":
								var parentElement = paragraphs[i];
								var childNodes = paragraphs[i].childNodes;
								var paraElement = document.createElement(paragraph);
								var parentNode = parentElement.parentNode;
								parentNode.insertBefore(paraElement, parentElement.nextSibling);
								for (var j = 0; j < childNodes.length; j++) {
									paraElement.appendChild(childNodes[j]);
								}
								parentNode.removeChild(parentElement);
								break;
							default:
								break;
						}
					}
					EditorHistory.execCommand('paragraph', false, paragraph);
					handleRangeChange();
				});
				break;
			case "cleardoc":
				editorState.content = "<p><br/></p>";
				break;
			case "horizontal":
				EditorHistory.execCommand('inserthtml', false, "<hr/><p><br/></p>");
				break;
			case "date":
				var strDate = new Date().Format("yyyy-MM-dd");
				EditorHistory.execCommand('inserthtml', false, strDate);
				break;
			case "time":
				var strTime = new Date().Format('hh:mm:ss');
				EditorHistory.execCommand('inserthtml', false, strTime);
				break;
			case "image":
				EditorSelection.storeRange();
				this.refs.image.open(function (e, html) {
					editarea.focus();
					EditorSelection.restoreRange();

					if (html && html.length > 0) {
						if (EditorSelection.range) {
							EditorHistory.execCommand('inserthtml', false, html);
						} else {
							editarea.innerHTML += html;
						}
					}
				});
				break;
			case "formula":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;
				offsetPosition.x -= offsetPosition.w / 2;
				var _self = this;
				this.refs.formula.open(offsetPosition, function (e, latex, id) {
					editarea.focus();
					EditorSelection.restoreRange();

					if (latex && latex.length > 0) {
						var html = '<p>&nbsp;<span class="mathquill-embedded-latex" id="' + id + '"></span>&nbsp;</p>';
						if (EditorSelection.range) {
							EditorHistory.execCommand('inserthtml', false, html);
						} else {
							editarea.innerHTML += html;
						}
						EditorTimer.setTimeout(function () {
							_self.addFormula(id, latex);
						}, 200);
						handleRangeChange();
					}
				});
				break;
			case "inserttable":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;
				offsetPosition.x -= offsetPosition.w / 2;
				this.refs.table.open(offsetPosition, function (e, html) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('inserthtml', false, html);
					handleRangeChange();
				});
				break;
			case "spechars":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;
				offsetPosition.x -= offsetPosition.w / 2;
				this.refs.special.open(offsetPosition, function (e, char) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('inserthtml', false, char);
					handleRangeChange();
				});
				break;
			case "emotion":
				EditorSelection.storeRange();
				offsetPosition.y += offsetPosition.h + 5;
				this.refs.emotion.open(offsetPosition, function (e, html) {
					editarea.focus();
					EditorSelection.restoreRange();
					EditorHistory.execCommand('inserthtml', false, html);
					handleRangeChange();
				});
				break;
		}
		// setState
		editorState.icons[state.icon] = state;
		editorState.icon = state.icon;
		EditorSelection.createRange();
		// range state
		editorState = this.exchangeRangeState(editorState);
		this.setState({
			editorState: editorState
		});
		EditorDOM.stopPropagation(e);
	},
	// utils
	getOffsetRootParentPosition: function getOffsetRootParentPosition(target) {
		var position = { x: 0, y: 0, w: 0, h: 0 };
		var root = ReactDOM.findDOMNode(this.refs.root);
		position.w = target.offsetWidth;
		position.h = target.offsetHeight;
		position.x = target.offsetLeft;
		position.y = target.offsetTop;
		var offsetParent = target.offsetParent;
		while (offsetParent && offsetParent != root) {
			position.x += offsetParent.offsetLeft;
			position.y += offsetParent.offsetTop;
			offsetParent = offsetParent.offsetParent;
		}
		return position;
	},
	addFormula: function addFormula(id, latex) {
		var editarea = ReactDOM.findDOMNode(this.refs.editarea);
		var htmlElement = document.getElementById(id);

		var config = {
			handlers: { edit: function edit() {} },
			restrictMismatchedBrackets: true
		};
		if (htmlElement == null && MQ == null) return;
		var mathField = MQ.MathField(htmlElement, config);
		mathField.latex(latex);
		var $htmlElement = $(htmlElement);
		$htmlElement.keydown(function (e) {
			mathField.focus();
			EditorDOM.stopPropagation(e);
		});
		$htmlElement.keyup(function (e) {
			mathField.focus();
			EditorDOM.stopPropagation(e);
		});
		$htmlElement.mouseup(function (e) {
			mathField.focus();
			EditorDOM.stopPropagation(e);
		});
		$htmlElement.mousedown(function (e) {
			EditorDOM.stopPropagation(e);
		});
		$htmlElement.mousemove(function (e) {
			EditorDOM.stopPropagation(e);
		});
		$(editarea).mousedown(function (e) {
			mathField.blur();
			EditorDOM.stopPropagation(e);
		});
		$(editarea).mousemove(function (e) {
			EditorDOM.stopPropagation(e);
		});
	},
	autoSave: function autoSave() {
		EditorHistory.execCommand('autosave', false, null);
	},
	// public functions
	findDOMNode: function findDOMNode(refName) {
		// 对外公布方法
		var keys = ["root", "editarea", "toolbar", "color"];
		if (keys.indexOf(refName) == -1) return { ref: null, dom: null };
		return {
			ref: this.refs[refName],
			dom: ReactDOM.findDOMNode(this.refs[refName])
		};
	},
	setContent: function setContent(content) {
		// 后续添加校验方法
		this.refs.editarea.setContent(content);
		// mathquill supports
		if (content.indexOf("mathquill-embedded-latex") != -1) {
			var _self = this;
			EditorTimer.setTimeout(function () {
				var editarea = ReactDOM.findDOMNode(_self.refs.editarea);
				var elements = editarea.querySelectorAll('.mathquill-embedded-latex');
				for (var i = 0; i < elements.length; i++) {
					if (!elements[i].id) {
						var id = "mathquill-" + i + "-" + new Date().valueOf();
						var latex = elements[i].innerHTML;
						elements[i].id = id;
						_self.addFormula(id, latex);
					}
				}
			}, 200);
		}
	},
	getContent: function getContent() {
		return this.refs.editarea.getContent();
	},
	focusEditor: function focusEditor() {
		var editarea = ReactDOM.findDOMNode(this.refs.editarea);
		editarea.focus();
	},
	// render functions 
	genEditArea: function genEditArea() {
		var showHtml = this.state.editorState.showHtml;
		if (showHtml) {
			return React.createElement(EditorTextArea, { ref: 'editarea' });
		} else {
			return React.createElement(EditorContentEditableDiv, { ref: 'editarea', onRangeChange: this.handleRangeChange });
		}
	},
	render: function render() {
		var editArea = this.genEditArea();
		var _props = this.props;
		var index = _props.index;
		var fontSize = _props.fontSize;
		var paragraph = _props.paragraph;
		var fontFamily = _props.fontFamily;
		var icons = _props.icons;
		var plugins = _props.plugins;
		var onBlur = _props.onBlur;
		var className = _props.className;
		var id = _props.id;
		var onFocus = _props.onFocus;
		var onClick = _props.onClick;
		var onEditorMount = _props.onEditorMount;

		var props = _objectWithoutProperties(_props, ['index', 'fontSize', 'paragraph', 'fontFamily', 'icons', 'plugins', 'onBlur', 'className', 'id', 'onFocus', 'onClick', 'onEditorMount']);

		var editorState = this.state.editorState;
		var _icons = icons.join(" ").replace(/\|/gm, "separator").split(" ");
		return React.createElement(
			'div',
			_extends({ ref: 'root', id: id, className: "editor-container editor-default" + (className ? " " + className : ""), onClick: this.handleClick, onBlur: this.handleRangeChange, onFocus: this.handleFocus }, props),
			React.createElement(
				EditorToolbar,
				{ ref: 'toolbar', editorState: editorState, onIconClick: this.handleToolbarIconClick, icons: this.props.icons, paragraph: this.props.paragraph, fontsize: this.props.fontSize, fontfamily: this.props.fontFamily },
				React.createElement(ImageDialog, { hidden: _icons.indexOf("image") == -1, ref: 'image', uploader: this.props.plugins.image.uploader }),
				React.createElement(ColorDropdown, { hidden: _icons.indexOf("forecolor") == -1 && _icons.indexOf("forecolor"), ref: 'color' }),
				React.createElement(FormulaDropdown, { hidden: _icons.indexOf("formula") == -1, ref: 'formula' }),
				React.createElement(TablePickerDropdown, { hidden: _icons.indexOf("inserttable") == -1, ref: 'table' }),
				React.createElement(SpecialCharsDialog, { hidden: _icons.indexOf("spechars") == -1, ref: 'special' }),
				React.createElement(EmotionDialog, { hidden: _icons.indexOf("emotion") == -1, ref: 'emotion' }),
				React.createElement(FontSizeComboBox, { hidden: _icons.indexOf("fontsize") == -1, ref: 'fontsize', fontsize: this.props.fontSize, value: editorState.icons["fontsize"] ? editorState.icons["fontsize"].value : fontSize[0].value }),
				React.createElement(FontFamilyComboBox, { hidden: _icons.indexOf("fontfamily") == -1, ref: 'fontfamily', fontfamily: this.props.fontFamily, value: editorState.icons["fontfamily"] ? editorState.icons["fontfamily"].value : fontFamily[0].value }),
				React.createElement(ParagraphComboBox, { hidden: _icons.indexOf("paragraph") == -1, ref: 'paragraph', paragraph: this.props.paragraph, value: editorState.icons["paragraph"] ? editorState.icons["paragraph"].value : paragraph[0].value })
			),
			editArea,
			React.createElement(EditorResize, { ref: 'resize' })
		);
	}
});

var EditorClass = React.createClass({
	displayName: 'EditorClass',

	getInitialState: function getInitialState() {
		return {
			loaded: false
		};
	},
	componentDidMount: function componentDidMount() {
		this.index = EditorEventEmitter.editorSum;
		EditorEventEmitter.addStartListener("start-" + this.index, this.handleChange);
	},
	componentWillUnmount: function componentWillUnmount() {
		var index = this.index;
		EditorEventEmitter.removeStartListener("start-" + index, this.handleChange);
	},
	handleChange: function handleChange() {
		this.setState({
			loaded: true
		});
	},
	handleMountSuccess: function handleMountSuccess() {
		EditorEventEmitter.mountEditorSuccess();
	},
	getContent: function getContent() {
		return this.refs.editor ? this.refs.editor.getContent() : "";
	},
	setContent: function setContent(content) {
		return this.refs.editor ? this.refs.editor.setContent(content) : "";
	},
	focusEditor: function focusEditor() {
		return this.refs.editor ? this.refs.editor.focusEditor() : "";
	},
	findDOMNode: function findDOMNode(refName) {
		return this.refs.editor ? this.refs.editor.findDOMNode(refName) : "";
	},
	render: function render() {
		var loaded = this.state.loaded;

		var props = _objectWithoutProperties(this.props, []);

		if (!this.state.loaded) {
			return React.createElement(
				'div',
				{ id: props.id, className: 'editor-contenteditable-div', style: { "minHeight": "30px", "border": "1px solid #ddd" } },
				'正在加载...'
			);
		} else {
			return React.createElement(Editor, _extends({ ref: 'editor' }, props, { onEditorMount: this.handleMountSuccess }));
		}
	}
});

module.exports = EditorClass;