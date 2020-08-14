const fs = require('fs');
fs.readFile('design.mcss', 'utf-8', (error, data) => {
	if(error) throw error;
	console.log(MCSS(data));
});

Array.prototype.fixedForEach = function(callback){
	for(let i = this.length - 1; i >= 0; --i){
		const index = this.length - 1 - i;
		callback(this[index], index, this);
	}
};

const MCSS = data => {
	const indent = (() => {
		const gcd = (a, b) => b ? gcd(b, a % b) : a;
		const indentArray = data.split('\n')
			.map(line => (line.match(/^\s+/) || [])[0])
			.filter(indent => indent);
		if(!indentArray.length) return '\t';
		const indentLength = indentArray.map(indent => indent.length)
			.reduce(gcd);
		return indentArray[0].slice(0, indentLength)
	})();
	// strip comments
	(() => {
		let inString = false;
		let inComment = false;
		let traditionalComment = false;
		let escaped = false;
		let prev = '';
		let result = '';
		for(const c of data){
			if(inString){
				if(escaped) escaped = false;
				else{
					if(c == '\\') escaped = true;
					if(inString == c) inString = false;
				}
			}
			else if(c == '\'' || c == '"') inString = c;
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
		data = result;
	})();
	const findSemiColon = () => {
		let inString = false;
		let escaped = false;
		let index = 0;
		for(const c of data){
			if(inString){
				if(escaped) escaped = false;
				else{
					if(c == '\\') escaped = true;
					if(inString == c) inString = false;
				}
			}
			else if(c == '\'' || c == '"') inString = c;
			else if(c == ';') break;
			index++;
		}
		return { text: ';', index };
	};
	const findMatchingColon = semicolon => {
		let inString = false;
		let parentheses = 0;
		let escaped = false;
		let index = semicolon.index - 1;
		while(index >= 0){
			const c = data[index];
			if(inString){
				if(escaped) escaped = false;
				else{
					if(c == '\\') escaped = true;
					if(inString == c) inString = false;
				}
			}
			else if(c == '\'' || c == '"') inString = c;
			else if(c == ')') parentheses++;
			else if(c == '(') parentheses--;
			else if(parentheses) 0;
			else if(c == ':') break;
			index--;
		}
		return { text: ':', index };
	};
	const findMatchingProperty = colon => {
		const index = data.slice(0, colon.index).search(/[\w-]+\s*$/);
		return { text: data.slice(index, colon.index).trim(), index };
	};
	const findMatchingValue = (colon, semicolon) => {
		const text = data.slice(colon.index + 1, semicolon.index).trim();
		const index = data.slice(colon.index + 1).indexOf(text) + colon.index;
		return { text, index };
	};
	const findLine = character => {
		const startIndex = data.slice(0, character.index).lastIndexOf('\n') + 1;
		let endIndex = data.slice(character.index).indexOf('\n');
		if(endIndex == -1) endIndex == data.length;
		return {
			text: data.slice(startIndex, character.index + endIndex),
			index: startIndex
		};
	};
	const findPropertyDepth = property => {
		if(!/\n\s$/.test(data.slice(0, property.index))) return -1;
		return data.slice(0, property.index)
			.match(/[^\S\n]*$/)[0]
			.split(indent).length - 1;
	};
	const findDepth = text => {
		let depth = 0;
		while(text.indexOf(indent) == 0){
			text = text.replace(indent, '');
			depth++;
		}
		return depth;
	};
	// ------------------------------------------------------
	const chunkify = () => {
		let chunks = [];
		let buildingSelector = false;
		let tree = [];
		while(data){
			if(!data.includes(';')) break;
			const semicolon = findSemiColon();
			const colon = findMatchingColon(semicolon);
			const property = findMatchingProperty(colon);
			const value = findMatchingValue(colon, semicolon);
			const depth = findPropertyDepth(property);
			if(/^\s*$/.test(data.slice(0, property.index))){
				// declaration
				buildingSelector = false;
				data = data.slice(semicolon.index + 1);
				if(depth != -1) while(tree.length > depth) tree.pop();
				chunks.push({
					property: property.text,
					value: value.text,
					depth: depth == -1 ? tree.length : depth,
					tree: [...tree]
				});
			}
			else {
				// selector / atrule
				if(data[0] == '\n'){
					data = data.slice(1);
					continue;
				}
				const lineDepth = findDepth(data);
				const newLineIndex = data.indexOf('\n');
				const selectorEnd = newLineIndex == -1 || property.index < newLineIndex
					? property.index - 1
					: newLineIndex;
				const selector = data.slice(0, selectorEnd).trim();
				if(lineDepth == tree.length) tree.push(selector);
				else if(lineDepth < tree.length - 1) tree = tree.slice(0, lineDepth).concat(selector);
				else if(buildingSelector) tree[lineDepth] += '\n' + selector;
				else tree[lineDepth] = selector;
				data = data.slice(selectorEnd);
				buildingSelector = true;
			}
		}
		chunks.forEach(chunk => {
			chunk.atRules = chunk.tree.filter(leaf => leaf[0] == '@');
			chunk.tree = chunk.tree.filter(leaf => leaf[0] != '@');
		});
		return chunks;
	};
	const getAtRules = value => {
		let inString = false;
		let escaped = false;
		let index = 0;
		for(const c of value){
			if(inString){
				if(escaped) escaped = false;
				else{
					if(c == '\\') escaped = true;
					if(inString == c) inString = false;
				}
			}
			else if(c == '\'' || c == '"') inString = c;
			else if(c == '@') break;
			index++;
		}
		let baseValue = value.slice(0, index).trim();
		const atRules = [];
		let transition = false;
		if(value[index] != '@') return { atRules, transition, baseValue };
		value.slice(index + 1)
			.split('@')
			.forEach(rule => {
				if(rule[0] == '<') atRules.push(`@media (max-width: ${rule.slice(1).trim()})`);
				else if(rule[0] == '>') atRules.push(`@media (min-width: ${rule.slice(1).trim()})`);
				else if(/\d| |\./.test(rule[0])) transition = rule.trim();
				else atRules.push('@' + rule);
			});
		return { atRules, transition, baseValue };
	};
	const setAtRules = (chunk, index, chunks) => {
		const { property, value, depth, tree } = chunk;
		const { atRules, transition, baseValue } = getAtRules(value);
		chunk.atRules.push(...atRules);
		chunk.value = baseValue;
		if(transition){
			chunks.splice(index + 1, 0, {
				property: 'add-transition',
				value: property + ' ' + transition,
				depth,
				tree: [...tree],
				atRules: [...chunk.atRules]
			})
		}
	};
	const filterInvalidIf = (chunk, index, chunks) => {
		const valid = chunk.tree.every(leaf => {
			if(leaf.slice(0, 3) != 'if(') return true;
			let statement = leaf.slice(3, -1).trim();
			if(statement == '') return false;
			while(/\(\.*\)/.test(statement)) statement = statement.replace(/\([^\(\)]\)/, '');
			statement = statement.replace(/[#.:][\w-]+/g, '')
				.replace(/=(["'])(?:(?=(\\?))\2.)*?\1/g, '')
				.replace(/\[[\w-]+=[\w-]\]/g, '')
				.replace(/\[[\w-]+\]/g, '');
			if(statement == '') return true;
			return false;
		});
		if(!valid) chunks.splice(index, 1);
	};
	const getSelector = tree => {
		const smartSplit = string => {
			let inString = false;
			let escaped = false;
			let list = [];
			let current = '';
			for(const c of string){
				current += c;
				if(inString){
					if(escaped) escaped = false;
					else{
						if(c == '\\') escaped = true;
						if(inString == c) inString = false;
					}
				}
				else if(c == '\'' || c == '"') inString = c;
				else if(c == ','){
					list.push(current.slice(0, -1));
					current = '';
				}
			}
			list.push(current);
			return list;
		};
		const list = [''];
		tree.forEach(selector => {
			const parts = smartSplit(selector)
				.map(part => part.trim());
			list.fixedForEach((val, ind) => {
				const selectorParts = parts.map(part => {
					if(!val) return part;
					if(part[0] == '&') return val + part.slice(1);
					if(part.slice(0, 3) != 'if(') return val + ' ' + part;
					return val + part.slice(3, -1);
				});
				list.splice(ind, 1, ...selectorParts);
			});
		});
		const longSelector = list.join(', ');
		if(longSelector.length >= 80) return list.join(',\n');
		else return longSelector;
	};
	const setSelector = chunk => {
		chunk.selector = getSelector(chunk.tree);
	};
	const spreadModel = (chunk, index, chunks) => {
		if(chunk.property != 'model') return;
		const parts = chunk.value.split('|').map(part => part.trim());
		const list = [];
		if(/^[\w-]+$/.test(parts[0])) list.push({property: 'display', value: parts.shift()});
		const [width, height] = parts.shift().split(/\s+/);
		if(width != '.') list.push({property: 'width', value: width});
		if(height != '.') list.push({property: 'height', value: height});
		const partProperties = ['padding', 'margin', 'box-sizing'];
		for(let part = parts.shift(); part; part = parts.shift()){
			list.push({property: partProperties.shift(), value: part});
		}
		chunks.splice(index, 1, ...list.map(item => ({
			...chunk,
			tree: [...chunk.tree],
			atRules: [...chunk.atRules],
			...item
		})));
	};
	const spreadPlace = (chunk, index, chunks) => {
		const { property } = chunk;
		if(property.slice(0, 5) != 'place') return;
		const parts = chunk.value.split('|').map(part => part.trim());
		const list = [];

		const maxPartsLength = property == 'place' ? 3 : 2;
		if(parts.length != maxPartsLength) list.push({property: 'position', value: 'absolute'});
		else if(parts[0] != '.') list.push({property: 'position', value: parts.shift()});
		else parts.shift();

		const transform = {};
		const readPart = (part, dir, [top, center, bottom]) => {
			part = part.split(/\s+/);
			if(part.length == 1) part.push(part[0], '0');
			else if(part.length == 2){
				if(places.includes(part[1])) part.push('0');
				else part.splice(1, 0, part[0]);
			}
			if(part[0] == bottom){
				transform[dir] = [part[1], '100%', '50%', '0%'][[top, center, bottom].indexOf(part[1]) + 1];
				list.push({property: bottom, value: part[2]});
			}
			else if(part[0] == center){
				transform[dir] = [part[1], '0%', '-50%', '-100%'][[top, center, bottom].indexOf(part[1]) + 1];
				list.push({property: top, value: part[2]});
			}
			else{
				transform[dir] = [part[1], '0%', '-50%', '-100%'][[top, center, bottom].indexOf(part[1]) + 1];
				list.push({property: top, value: part[2]});
			}
		};
		if(property != 'place-horizontal') readPart(parts.shift(), 'y', ['top', 'center', 'bottom']);
		if(property != 'place-vertical') readPart(parts.shift(), 'x', ['left', 'center', 'right']);
		if(parseFloat(transform.x)){
			if(parseFloat(transform.y)) list.push({property: 'add-transform', value: `translate(${transform.x}, ${transform.y})`});
			else list.push({property: 'add-transform', value: `translateX(${transform.x})`});
		}
		else if(parseFloat(transform.y)) list.push({property: 'add-transform', value: `translateY(${transform.y})`});
		chunks.splice(index, 1, ...list.map(item => ({
			...chunk,
			tree: [...chunk.tree],
			atRules: [...chunk.atRules],
			...item
		})));
	};
	const spreadQuadruples = (chunk, index, chunks) => {
		const { property } = chunk;
		if(!['margin', 'padding'].includes(property)) return;
		const list = [];
		const parts = chunk.value.split(/\s+/);
		if(parts.every(part => part != '.')) return;
		const add = values => {
			values.forEach((value, index) => {
				if(parts[value] == '.') return;
				list.push({
					property: property + '-' + ['top', 'right', 'bottom', 'left'][index],
					value: parts[value]
				});
			});
		}
		if(parts.length == 2) add([0, 1, 0, 1]);
		if(parts.length == 3) add([0, 1, 2, 1]);
		if(parts.length == 4) add([0, 1, 2, 3]);
		chunks.splice(index, 1, ...list.map(item => ({
			...chunk,
			tree: [...chunk.tree],
			atRules: [...chunk.atRules],
			...item
		})));
	};
	const getTransitionValue = (addChunks, baseChunk) => {
		const { selector } = addChunks[0].selector;
		let parts = (() => {
			const result = [];
			if(!baseChunk){
				result.push(baseChunk.value.split(/\s*,\s*/)
					.map(part => ({
						property: part.match(/^\s*[\w-]*/)[0],
						original: part
					}))
				);
			}
			addChunks.forEach(chunk => {
				const parts = chunk.value.split(/\s*,\s*/)
					.map(part => ({
						property: part.match(/^\s*[\w-]*/)[0],
						original: part
					}));
				result.push(...parts);
			});
			return result;
		})();
		const foundProperties = [];
		for(let index = parts.length - 1; index >= 0; --index){
			const part = parts[index];
			if(foundProperties.includes(part.property)){
				parts.splice(index, 1);
				continue;
			}
			foundProperties.push(part.property);
		}
		parts = parts.map(part => part.original)
		return newValue = parts.length > 2
			? parts.reduce((acc, cur) => acc + ',\n\t\t' + cur)
			: parts.reduce((acc, cur) => acc + ', ' + cur);
	};
	const setBaseTransitions = chunks => {
		const initialChunk = chunks.find(chunk => {
			if(chunk.property != 'add-transition') return false;
			if(chunk.tree[chunk.tree.length - 1].slice(0, 3) == 'if(') return false;
			return true;
		});
		const tree = 0;
	};
	const chunks = chunkify();
	chunks.fixedForEach(setAtRules);
	chunks.fixedForEach(filterInvalidIf);
	chunks.fixedForEach(setSelector);
	chunks.fixedForEach(spreadModel);
	chunks.fixedForEach(spreadPlace);
	chunks.fixedForEach(spreadQuadruples);

	return chunks;
};