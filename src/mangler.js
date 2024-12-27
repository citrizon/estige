/*
	EStige, a complete AST manipulation toolkit.
	Open-Source, MIT License.

	Copyright (C) 2024 Botaro Shinomiya <nothing@citri.one>

	Given copyright notes are for exclusive rights to go
	beyond the license's limits. For more information, please
	check https://github.com/luskproject/estige/
*/

const traverser = require( './traverser' );

const ctorReserved = new Set(["in","instanceof","debugger","continue","function","extends","default","import","typeof","return","super","break","throw","const","while","yield","class","do","if","else","case","void","new","enum","try","var","this","Symbol","Map","Promise","Proxy","Reflect","Set","WeakMap","WeakSet","assign","getPrototypeOf","setPrototypeOf","getOwnPropertyDescriptor","getOwnPropertyDescriptors","keys","values","entries","is","defineProperty","defineProperties","create","getOwnPropertyNames","getOwnPropertySymbols","isExtensible","preventExtensions","freeze","isFrozen","seal","isSealed","fromEntries","hasOwn","groupBy","prototype","length","name","toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__","__proto__","constructor","isArray","from","fromAsync","of","join","reverse","sort","push","pop","shift","unshift","splice","concat","slice","lastIndexOf","indexOf","forEach","map","filter","reduce","reduceRight","some","every","find","findIndex","copyWithin","fill","includes","flatMap","flat","at","findLast","findLastIndex","toReversed","toSorted","toSpliced","with","apply","call","bind","arguments","caller","isFinite","isInteger","isNaN","isSafeInteger","POSITIVE_INFINITY","NEGATIVE_INFINITY","MAX_VALUE","MIN_VALUE","MAX_SAFE_INTEGER","MIN_SAFE_INTEGER","EPSILON","parseInt","parseFloat","NaN","toFixed","toExponential","toPrecision","fromCharCode","fromCodePoint","raw","toLowerCase","toUpperCase","charAt","charCodeAt","codePointAt","substring","padStart","padEnd","startsWith","endsWith","trim","trimStart","trimEnd","toLocaleLowerCase","toLocaleUpperCase","localeCompare","repeat","normalize","match","matchAll","search","replace","replaceAll","split","substr","bold","italics","fixed","strike","small","big","blink","sup","sub","anchor","link","fontcolor","fontsize","trimLeft","trimRight","isWellFormed","toWellFormed","message","stack","abs","acos","asin","atan","atan2","ceil","clz32","cos","exp","floor","imul","fround","f16round","log","max","min","pow","random","round","sin","sqrt","tan","log10","log2","log1p","expm1","cosh","sinh","tanh","acosh","asinh","atanh","hypot","trunc","sign","cbrt","E","LOG2E","LOG10E","LN2","LN10","PI","SQRT2","SQRT1_2","UTC","parse","now","getTime","getTimezoneOffset","getYear","getFullYear","getUTCFullYear","getMonth","getUTCMonth","getDate","getUTCDate","getDay","getUTCDay","getHours","getUTCHours","getMinutes","getUTCMinutes","getSeconds","getUTCSeconds","getMilliseconds","getUTCMilliseconds","setTime","setYear","setFullYear","setUTCFullYear","setMonth","setUTCMonth","setDate","setUTCDate","setHours","setUTCHours","setMinutes","setUTCMinutes","setSeconds","setUTCSeconds","setMilliseconds","setUTCMilliseconds","toUTCString","toLocaleDateString","toLocaleTimeString","toDateString","toTimeString","toISOString","toJSON","toGMTString","input","lastMatch","lastParen","leftContext","rightContext","$1","$2","$3","$4","$5","$6","$7","$8","$9","$_","$&","$+","$`","$'","compile","exec","test","flags","hasIndices","global","ignoreCase","multiline","dotAll","source","sticky","unicode","unicodeSets","for","keyFor","isConcatSpreadable","iterator","species","hasInstance","toPrimitive","toStringTag","unscopables","asyncIterator","description","isView","resize","transfer","transferToFixedLength","byteLength","maxByteLength","resizable","detached","getInt8","getUint8","getInt16","getUint16","getInt32","getUint32","getFloat16","getFloat32","getFloat64","getBigInt64","getBigUint64","setInt8","setUint8","setInt16","setUint16","setInt32","setUint32","setFloat16","setFloat32","setFloat64","setBigInt64","setBigUint64","buffer","byteOffset","BYTES_PER_ELEMENT","stringify","get","has","set","delete","clear","size","all","allSettled","any","race","reject","resolve","withResolvers","then","catch","finally","revocable","construct","deleteProperty","ownKeys","add","union","difference","intersection","symmetricDifference","isSubsetOf","isSupersetOf","isDisjointFrom","null","true","false","NaN","Infinity","-Infinity","undefined"]);

class NameGenerator {
	constructor () {
		this.alphabet = 'abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ'.split( '' ).sort( e => 0.5 - Math.random() ).join( '' );
		this.iteration = 0;
	}
	iterateSub () {
		let quotient = this.iteration, result = "", leftoverIndex = 0;

		// First Iteration
		result = this.alphabet[ quotient % this.alphabet.length ] + result;
		quotient = Math.floor( quotient / this.alphabet.length );
		leftoverIndex = 1;

		while ( quotient > 0 ) {
			result = this.alphabet[ ( quotient - 1 ) % this.alphabet.length ] + result;
			quotient = Math.floor( quotient / this.alphabet.length );
			leftoverIndex = 1;
		}
		this.iteration++;
		return result;
	}
	iterate () {
		let generated = this.iterateSub();
		while ( ctorReserved.has( generated ) )
			generated = this.iterateSub();
		return generated;
	}
}

// Search pattern for properties of nodes
// that are in parent scope.
const parentScopePattern = {
	ForOfStatement: [ 'left' ],
	ForInStatement: [ 'left' ],
	ForStatement: [ 'init' ],
	FunctionDeclaration: [ 'id', 'params' ],
	FunctionExpression: [ 'id', 'params' ],
	ArrowFunctionExpression: [ 'params' ],
	ClassDeclaration: [ 'id' ],
	ClassExpression: [ 'id' ],
};

// Search pattern for properties of nodes
// that are in sibling scope.
const siblingScopePattern = {
	VariableDeclaration: [ 'declarations' ],
	AssignmentPattern: [ 'left' ],
	ArrayPattern: [ 'elements' ],
	FunctionDeclaration: [ 'id' ],
	ClassDeclaration: [ 'id' ],
};

function searchNodesBase ( node, original ) {
	if ( node?.type === 'Identifier' )
		return node.__original === original;
	if ( node?.type === 'VariableDeclarator' )
		return node.id.__original === original;
	if ( node?.type === 'VariableDeclaration' )
		return node.declarations.some( e => searchNodesBase( e.id, original ) )
	if ( node?.type === 'AssignmentPattern' )
		return node.left.__original === original;
}

function searchNodes ( node, properties, original ) {
	return properties.some( property => {
		const prop = node?.[ property ];
		if ( typeof prop === 'undefined' || prop === null )
			return false;
		if ( Array.isArray( prop ) && prop.some( e => searchNodesBase( e, original ) ) )
			return true;
		return searchNodesBase( prop, original );
	} );
}


function scanScope ( node, original ) {
	if ( node === null || typeof node === 'undefined' )
		return false;

	// Block Types
	if ( (
		node.type === 'BlockStatement'
		|| node.type === 'Program' )
		&& node.body.some( sub => {
			const sib = siblingScopePattern[ sub.type ];
			if ( sib ) return searchNodes( sub, sib, original );
		} )
	) return true;

	const sib = parentScopePattern[ node.type ];
	if ( sib ) return searchNodes( node, sib, original );
}

function mangleRules ( ancestors, key ) {
	const parent = ancestors[ 0 ];
	if ( parent?.type === 'MemberExpression'
		&& key !== 'object' && !parent?.computed )
		return false;
	if ( parent?.type === 'Property' && parent.shorthand === true )
		parent.shorthand = false;
	if ( parent?.type === 'PropertyDefinition' && key === 'key' )
		return false
	if ( parent?.type === 'Property' && key === 'key' )
		return false;
	return true;
}

function mangle ( ast, setup ) {
	const nGenerated = new NameGenerator();
	let mangleable = {}

	// Layer 1: Find candidates to mangle.
	traverser.watch( ast, {
		VariableDeclaration ( node ) {
			for ( const declaration of node.declarations )
				mangleable[ declaration.id.name ] = true
		},
		ClassDeclaration    ( node ) { mangleable[ node.id.name   ] = true },
		FunctionDeclaration ( node ) {
			if ( node.id === null )
				// This is most likely a "export default"
				// situation haha
				return;
			mangleable[ node.id.name ] = true
		},
		AssignmentPattern   ( node ) { mangleable[ node.left.name ] = true },
		Identifier ( node, manager ) {
			if (
				// Functions
				(
					manager?.property === 'params'
					&& (
						manager?.parent?.type === 'ArrowFunctionExpression'
						|| manager?.parent?.type === 'FunctionExpression'
						|| manager?.parent?.type === 'FunctionDeclaration'
					)
				)
			) mangleable[ node.name ] = true
		}
	} );

	// Layer 2: Mangle the names
	for ( const key of Object.keys( mangleable ) ) {
		if ( setup?.reserved?.includes?.( key ) )
			continue;
		let generated = nGenerated.iterate();
		while ( mangleable[ generated ] )
			generated = nGenerated.iterate();
		mangleable[ key ] = generated;
	}

	// Layer 3: Mangle the declarators first
	traverser.watch( ast, {
		VariableDeclaration ( node ) {
			for ( const declaration of node.declarations )
				if ( mangleable[ declaration.id.name ] ) {
					declaration.id.__original = declaration.id.name;
					declaration.id.name = mangleable[ declaration.id.name ];
					declaration.id.__belongsToDeclarator = true;
				}
		},
		ClassDeclaration ( node ) {
			if ( mangleable[ node.id.name ] ) {
				node.id.__original = node.id.name;
				node.id.name = mangleable[ node.id.name ];
				node.id.__belongsToDeclarator = true;
			}
		},
		FunctionDeclaration ( node ) {
			if ( node.id === null )
				// This is most likely a "export default"
				// situation haha
				return;
			if ( mangleable[ node.id.name ] ) {
				node.id.__original = node.id.name;
				node.id.name = mangleable[ node.id.name ];
				node.id.__belongsToDeclarator = true;
			}
		},
		AssignmentPattern ( node ) {
			if ( mangleable[ node.left.name ] ) {
				node.left.__original = node.left.name;
				node.left.name = mangleable[ node.left.name ];
				node.left.__belongsToDeclarator = true;
			}
		}
	} );

	// Layer 4: Mangle the names now :3
	return traverser.traverse( ast, {
		Identifier ( node, manager ) {
			if (
				mangleable[ node.name ] &&
				// Functions
				(
					manager?.property === 'params'
					&& (
						manager?.parent?.type === 'ArrowFunctionExpression'
						|| manager?.parent?.type === 'FunctionExpression'
						|| manager?.parent?.type === 'FunctionDeclaration'
					)
				)
			) {
				node.__original = node.name;
				node.name = mangleable[ node.name ];
				node.__belongsToDeclarator = true;
				return;
			}

			// Now we must do a scope scanning :3
			if (
				mangleable[ node.name ]
				&& mangleRules( manager.ancestors, manager.property )
				&& manager.ancestors.some( ancestor =>
					scanScope( ancestor, node.name ) )
			) {
				node.name = mangleable[ node.name ];
			}
		}
	} );
}

module.exports = {
	mangle
};