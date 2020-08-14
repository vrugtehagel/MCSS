const MCSS = function(mcss, options = {}){
	const indent = options.indentation || '\t';
	// strip comments
	(() => {
		let inString = false;
		let inComment = false;
		let traditionalComment = false;
		let escaped = false;
		let prev = '';
		let result = '';
		for(const c of mcss){
			if(inString) escaped = escaped ? false : c == '\\' ? true : escaped;
			else if(c == '\'' || c == '"') inString = true;
			else if(inComment){
				if(traditionalComment){
					if(prev == '*' && c == '/') inComment = false;
					prev = c;
					continue;
				}
				else {
					prev = c;
					if(c == '\n') inComment = false;
					else continue;
				}
			}
			else if(prev == '/' && (c == '/' || c == '*')){
				inComment = true;
				traditionalComment = (c == '*');
				result = result.slice(0, -1);
				prev = c;
				continue;
			}
			result += c;
			prev = c;
		}
		mcss = result;
	})();
	const read = (text, depth = -1) => {
		if(/^\s\n/.test(text)) return read(text.slice(1));
		if(depth == -1 && text[0] == '\n') return read(text, 0);
		if(depth >= 0 && text.indexOf(indent) == 0) return read(text.slice(indent.length), depth + 1);
		if(/\s/.test(text[0])) return read(text.slice(1), depth);
		if(!text.includes(';')) return { left: '', type: 'garbage' };
		let atRule = text[0] == '@';
		let inParentheses = false;
		let inString = false;
		let escaped = false;
		let colon = -1;
		let index = 0;
		if(atRule && text.slice(0, 10) == '@keyframes'){
			const match = text.match(/@keyframes\s+\S+/)[0];
			return {
				type: 'atrule',
				text: match,
				left: text.slice(match.length),
				depth,
			}
		}
		for(const c of text){
			if(inString) escaped = escaped ? false : c == '\\' ? true : escaped;
			else if(c == '\'' || c == '"') inString = true;
			else if(inParentheses) inParentheses = c != ')';
			else if(c == '(') inParentheses = true;
			else if(c == ':') colon = index;
			else if(c == ';') break;
			index++;
		}
		for(let i = colon; i >= 0; --i){
			if(/\s/.test(text[i]) && /\S/.test(text[i-1])){
				const selector = text.slice(0, i);
				if(selector.match('\n' + indent.repeat(depth + 1))){
					return {
						type: atRule ? 'atrule' : 'selector',
						text: text.slice(0, text.indexOf('\n'  + indent.repeat(depth + 1))).trim(),
						left: text.slice(text.indexOf('\n'  + indent.repeat(depth + 1))),
						depth
					};
				}
				else {
					return {
						type: atRule ? 'atrule' : 'selector',
						text: text.slice(0, i),
						left: text.slice(i),
						depth
					};
				}
			}
		}
		return {
			type: 'declaration',
			text: text.slice(0, text.indexOf(';') + 1),
			left: text.slice(text.indexOf(';') + 1),
			depth
		};
	};
	let chunks = [];
	for(let text = '\n' + mcss; text.trim().length;){
		const {left, ...rest} = read(text);
		text = left;
		if(rest.type != 'garbage') chunks.push(rest);
	}
	// fix indentation (where depth == -1)
	(() => {
		let previousChunk;
		for(const chunk of chunks){
			if(chunk.depth == -1){
				if(!previousChunk) chunk.depth = 0;
				else if(previousChunk.type == 'declaration') chunk.depth = previousChunk.depth;
				else chunk.depth = previousChunk.depth + 1;
			}
			previousChunk = chunk;
		}
	})();

	class MCSSFile {
		constructor(data = []){
			this.data = data;
		}
		add(chunk){
			const declaration = new Declaration(chunk);
			this.data.push(declaration);
			declaration.parent = this;
		}
		replace(chunk, newChunks){
			const index = this.data.indexOf(chunk);
			if(index == -1) return;
			this.data.splice(i, 1, ...newChunks);
		}
		apply(func){
			const parsed = [];
			for(const chunk of this.data){
				const result = chunk[func]();
				if(result) parsed.push(...result);
				else parsed.push(chunk);
			}
			this.data = parsed;
			this.data.forEach(chunk => chunk.parent = this);
		}
	}

	class Declaration {
		constructor({text, property, value, selectorTree, atRules}){
			if(text){
				const colonIndex = text.indexOf(':');
				this.property = text.slice(0, colonIndex);
				this.value = text.slice(colonIndex + 1, -1).trim();
			}
			else {
				this.property = property;
				this.value = value;
			}
			this.selectorTree = selectorTree.length ? selectorTree : [':root'];
			this.atRules = atRules;
		}
		readShorthand(){
			const parsed = [];
			const add = ({ property, value }) => {
				if(!value) return;
				if(value.includes('.') && !/\.\d/.test(value)) return;
				parsed.push(new Declaration({
					property,
					value,
					selectorTree: [...this.selectorTree],
					atRules: [...this.atRules]
				}));
			};
			if(this.property == 'model'){
				const parts = this.value.split('|').map(part => part.trim());
				if(!parts[0].includes(' ')){
					// display
					add({ property: 'display', value: parts[0] });
					parts.shift();
				}
				// width, height
				const [width, height] = parts.shift().split(/\s+/);
				add({ property: 'width', value: width });
				add({ property: 'height', value: height });
				// padding
				const padding = parts.shift();
				if(!padding) return parsed;
				if(/\.\D|\.$/.test(padding)){
					// seperate values
					const bits = padding.split(/\s+/);
					if(bits.length == 2){
						add({ property: 'padding-top', value: bits[0] });
						add({ property: 'padding-right', value: bits[1] });
						add({ property: 'padding-bottom', value: bits[0] });
						add({ property: 'padding-left', value: bits[1] });
					}
					if(bits.length == 3){
						add({ property: 'padding-top', value: bits[0] });
						add({ property: 'padding-right', value: bits[1] });
						add({ property: 'padding-bottom', value: bits[2] });
						add({ property: 'padding-left', value: bits[1] });
					}
					if(bits.length == 4){
						add({ property: 'padding-top', value: bits[0] });
						add({ property: 'padding-right', value: bits[1] });
						add({ property: 'padding-bottom', value: bits[2] });
						add({ property: 'padding-left', value: bits[3] });
					}
				}
				else {
					add({ property: 'padding', value: padding});
				}
				const margin = parts.shift();
				if(!margin) return parsed;
				if(/\.\D|\.$/.test(margin)){
					// seperate values
					const bits = margin.split(/\s+/);
					if(bits.length == 2){
						add({ property: 'margin-top', value: bits[0] });
						add({ property: 'margin-right', value: bits[1] });
						add({ property: 'margin-bottom', value: bits[0] });
						add({ property: 'margin-left', value: bits[1] });
					}
					if(bits.length == 3){
						add({ property: 'margin-top', value: bits[0] });
						add({ property: 'margin-right', value: bits[1] });
						add({ property: 'margin-bottom', value: bits[2] });
						add({ property: 'margin-left', value: bits[1] });
					}
					if(bits.length == 4){
						add({ property: 'margin-top', value: bits[0] });
						add({ property: 'margin-right', value: bits[1] });
						add({ property: 'margin-bottom', value: bits[2] });
						add({ property: 'margin-left', value: bits[3] });
					}
				}
				else {
					add({ property: 'margin', value: margin});
				}
				const boxSizing = parts.shift();
				if(!boxSizing) return parsed;
				add({ property: 'box-sizing', value: boxSizing});
				return parsed;
			}
			else if(this.property.slice(0, 5) == 'place'){
				const parts = this.value.split('|').map(part => part.trim());
				if(!parts[0].includes(' ')){
					add({ property: 'position', value: parts[0] });
					parts.shift();
				}
				else {
					add({ property: 'position', value: 'absolute' });
				}
				const vertical = this.property == 'place'
					? parts[0]
					: this.property == 'place-vertical'
						? this.value
						: '';
				const horizontal = this.property == 'place'
					? parts[1]
					: this.property == 'place-horizontal'
						? this.value
						: '';
				if(vertical){
					let child = '0';
					let dist = '0';
					let parent;
					let whitespaces = (vertical.match(/\s+/g) || []).length;
					if(whitespaces == 0) parent = vertical;
					else if(whitespaces == 1) [parent, dist] = vertical.split(/\s+/);
					else if(whitespaces == 2) [parent, child, dist] = vertical.split(/\s+/);
					else throw Error(`wat is dis value man? "place: ${this.value}"`);
					child = [child, '0%', '-50%', '-100%'][['top', 'center', 'bottom'].indexOf(child) + 1];
					if(parent == 'top') add({ property: 'top', value: dist });
					else if(parent == 'center') add({ property: 'top', value: '50%' });
					else if(parent == 'bottom') add({ property: 'bottom', value: dist });
					if(parseFloat(child) != 0) add({ property: 'add-transform', value: `translateY(${child})` });
				}
				if(horizontal){
					let child = '0';
					let dist = '0';
					let parent;
					let whitespaces = (horizontal.match(/\s+/g) || []).length;
					if(whitespaces == 0) parent = horizontal;
					else if(whitespaces == 1) [parent, dist] = horizontal.split(/\s+/);
					else if(whitespaces == 2) [parent, child, dist] = horizontal.split(/\s+/);
					else throw Error(`wat is dis value man? "place: ${this.value}"`);
					child = [child, '0%', '-50%', '-100%'][['left', 'center', 'right'].indexOf(child) + 1];
					if(parent == 'left') add({ property: 'left', value: dist });
					else if(parent == 'center') add({ property: 'left', value: '50%' });
					else if(parent == 'right') add({ property: 'right', value: dist });
					if(parseFloat(child) != 0) add({ property: 'add-transform', value: `translateX(${child})` });
				}
				return parsed;
			}
			else return false;
		}
		readAtRules(){
			if(!this.value.includes('@')) return false;
			let inString = false;
			let escaped = false;
			let index = 0;
			let at = -1;
			for(const c of this.value){
				if(inString) escaped = escaped ? false : c == '\\' ? true : escaped;
				else if(c == '\'' || c == '"') inString = true;
				else if(c == '@') break;
				index++;
			}
			if(index == -1) return false;
			let rules = this.value.slice(index).split('@').slice(1).map(rule => '@' + rule);
			this.value = this.value.slice(0, index).trim();
			const results = [this];
			for(const rule of rules){
				if(/\s/.test(rule[1])){
					results.push(new Declaration({
						property: 'add-transition',
						value: this.property + ' ' + rule.slice(2).trim(),
						selectorTree: [...this.selectorTree],
						atRules: [...this.atRules],
					}));
				}
				else if(rule[1] == '<') this.atRules.push(`@media (max-width: ${rule.slice(2).trim()})`);
				else if(rule[1] == '>') this.atRules.push(`@media (min-width: ${rule.slice(2).trim()})`);
				else this.atRules.push(rule);
			}
			return results;
		}
		readTransition(){
			if(this.property != 'add-transition') return;
			
		}
	}

	file = new MCSSFile();
	const selectorTree = [];
	const atRules = [];
	const tree = [];
	for(const chunk of chunks){
		if(chunk.depth > tree.length) throw Error(`Indentation is weird near "${chunk.text}"`);
		while(chunk.depth < tree.length){
			const lastLeaf = tree.pop();
			if(lastLeaf.type == 'selector') selectorTree.pop();
			else if(lastLeaf.type == 'atrule') atRules.pop();
		}
		if(chunk.type == 'declaration'){
			file.add({
				text: chunk.text,
				selectorTree: [...selectorTree],
				atRules: [...atRules]
			});
		}
		else if(chunk.type == 'selector'){
			tree.push(chunk);
			selectorTree.push(chunk.text);
		}
		else if(chunk.type == 'atrule'){
			tree.push(chunk);
			atRules.push(chunk.text);
		}
	}

	file.apply('readShorthand');
	file.apply('readAtRules');
	file.apply('readTransition');

	return file.data;
}


console.log(MCSS(`
font-size: 16px;

div  
	model: block | 100px 200px | . . . 10px | 0 auto 108px | border-box;
	place: top bottom 18px | left;
	opacity: 1 @ .2s;
	add-transition: color 2s ease,
		top .32s,
		margin 1s .1s,
		color 1s;
	if(.active) background-color: grey;
	if(:hover)
		border-radius: 50%;
		background-color: red;
	@media (max-width: 23px)
		color: purple;
		if(:active) opacity: 0 @ .2s .2s @supports (no: it-doesnt);
	if(main > this) place-vertical: bottom top 0;
	a, p // with a comment
		@media (max-width: 100px)
			font: 10px / 1.5;
		color: black;

span:focus outline: thicc;

@keyframes fade
	from opacity: 1;
	via opacity: .2;
	via opacity: .8;
	to opacity: 0;
`)
);

/* OUTPUT

:root {
	font-size: 16px;
}

div {
	display: block;
	width: 100px;
	height: 200px;
	padding-left: 10px;
	margin: 0 auto 108px;
	box-sizing: border-box;
	position: absolute;
	top: 18px;
	left: 0;
	transform: translateY(-100%);
	opacity: 1;
	transition: opacity .2s;
}
div.active { background-color: grey; }
div:hover {
	border-radius: 50%;
	background-color: red;
}
div:active {
	opacity: 0;
	transition: opacity .2s .2s;
}
main > div { top: 0; }

div a, div p { color: black; }

@media (max-width: 1000px){
	div a, div p {
		font-size: 10px;
		line-height: 1.5;
	}
}

span:focus { outline: thicc; }

@keyframes fade {
	from { opacity: 1; }
	33.333% { opacity: .2; }
	66.667% { opacity: .8; }
	to { opacity: 0; }
}
*/