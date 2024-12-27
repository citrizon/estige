/*
	EStige, a complete AST manipulation toolkit.
	Open-Source, MIT License.

	Copyright (C) 2024 Botaro Shinomiya <nothing@citri.one>

	Given copyright notes are for exclusive rights to go
	beyond the license's limits. For more information, please
	check https://github.com/luskproject/estige/
*/

const nodeVisitable = {
	AssignmentExpression: [ 'left', 'right' ],
	AssignmentPattern: [ 'left', 'right' ],
	ArrayExpression: [ 'elements' ],
	ArrayPattern: [ 'elements' ],
	ArrowFunctionExpression: [ 'params', 'body' ],
	AwaitExpression: [ 'argument' ],
	BlockStatement: [ 'body' ],
	BinaryExpression: [ 'left', 'right' ],
	BreakStatement: [ 'label' ],
	CallExpression: [ 'callee', 'arguments' ],
	CatchClause: [ 'param', 'body' ],
	ChainExpression: [ 'expression' ],
	ClassBody: [ 'body' ],
	ClassDeclaration: [ 'id', 'superClass', 'body' ],
	ClassExpression: [ 'id', 'superClass', 'body' ],
	ComprehensionBlock: [ 'left', 'right' ],
	ComprehensionExpression: [ 'blocks', 'filter', 'body' ],
	ConditionalExpression: [ 'test', 'consequent', 'alternate' ],
	ContinueStatement: [ 'label' ],
	DoWhileStatement: [ 'body', 'test' ],
	ExportAllDeclaration: [ 'source' ],
	ExportDefaultDeclaration: [ 'declaration' ],
	ExportNamedDeclaration: [ 'declaration', 'specifiers', 'source' ],
	ExportSpecifier: [ 'exported', 'local' ],
	ExpressionStatement: [ 'expression' ],
	ForStatement: [ 'init', 'test', 'update', 'body' ],
	ForInStatement: [ 'left', 'right', 'body' ],
	ForOfStatement: [ 'left', 'right', 'body' ],
	FunctionDeclaration: [ 'id', 'params', 'body' ],
	FunctionExpression: [ 'id', 'params', 'body' ],
	GeneratorExpression: [ 'blocks', 'filter', 'body' ],
	IfStatement: [ 'test', 'consequent', 'alternate' ],
	ImportExpression: [ 'source' ],
	ImportDeclaration: [ 'specifiers', 'source' ],
	ImportDefaultSpecifier: [ 'local' ],
	ImportNamespaceSpecifier: [ 'local' ],
	ImportSpecifier: [ 'imported', 'local' ],
	LabeledStatement: [ 'label', 'body' ],
	LogicalExpression: [ 'left', 'right' ],
	MemberExpression: [ 'object', 'property' ],
	MetaProperty: [ 'meta', 'property' ],
	MethodDefinition: [ 'key', 'value' ],
	NewExpression: [ 'callee', 'arguments' ],
	ObjectExpression: [ 'properties' ],
	ObjectPattern: [ 'properties' ],
	Program: [ 'body' ],
	Property: [ 'key', 'value' ],
	PropertyDefinition: [ 'key', 'value' ],
	RestElement: [ 'argument' ],
	ReturnStatement: [ 'argument' ],
	SequenceExpression: [ 'expressions' ],
	SpreadElement: [ 'argument' ],
	SwitchStatement: [ 'discriminant', 'cases' ],
	SwitchCase: [ 'test', 'consequent' ],
	TaggedTemplateExpression: [ 'tag', 'quasi' ],
	TemplateLiteral: [ 'quasis', 'expressions' ],
	ThrowStatement: [ 'argument' ],
	TryStatement: [ 'block', 'handler', 'finalizer' ],
	UnaryExpression: [ 'argument' ],
	UpdateExpression: [ 'argument' ],
	VariableDeclaration: [ 'declarations' ],
	VariableDeclarator: [ 'id', 'init' ],
	WhileStatement: [ 'test', 'body' ],
	WithStatement: [ 'object', 'body' ],
	YieldExpression: [ 'argument' ],
	JSXElement: [ 'children', 'openingElement', 'closingElement' ],
	JSXOpeningElement: [ 'name', 'attributes' ],
	JSXClosingElement: [ 'name' ],
	JSXAttribute: [ 'name', 'value' ]
}

function fastIterate ( arr, iter ) {
	// We know that we have maximum 4 items
	// inside every visitorKey definitions.
	const len = arr.length;
	switch ( len ) {
		case 0: return;
		case 1: return iter( arr[ 0 ], 0, len );
		case 2:
			iter( arr[ 0 ], 0, len );
			iter( arr[ 1 ], 1, len );
			return;
		case 3:
			iter( arr[ 0 ], 0, len );
			iter( arr[ 1 ], 1, len );
			iter( arr[ 2 ], 2, len );
			return;
		case 4:
			iter( arr[ 0 ], 0, len );
			iter( arr[ 1 ], 1, len );
			iter( arr[ 2 ], 2, len );
			iter( arr[ 3 ], 3, len );
			return;
	}
	return arr.forEach( iter );
}

function deepModify ( source, target ) {
	if ( typeof source !== 'object' )
		throw new Error( 'Expected an object' );
	for ( const key of Object.keys( source ) ) {
		if ( target[ key ] && typeof source[ key ] === 'object' )
			deepModify( source[ key ], target[ key ] );
		else target[ key ] = source[ key ];
	}
	return target;
}

function fastClone ( obj ) {
	if ( obj === null || 'undefined' == typeof obj )
		return obj;
	if ( obj.map )
		return obj.map( fastClone );
	let ret = {};
	for ( key in obj ) {
		if ( obj.hasOwnProperty( key ) ) {
			val = obj[ key ];
			if ( typeof val === 'object' )
				ret[ key ] = fastClone( val );
			else ret[ key ] = val;
		}
	}
	return ret;
}

function NodeReference ( parent, property, ancestors, index ) {
	this.parent = parent;
	this.property = property;
	this.index = index ?? null;
	this.ancestors = ancestors;
}

NodeReference.prototype.remove = function () {
	if ( typeof this.index !== 'undefined' ) {
		delete this.parent[ this.property ][ this.index ];
		return this.shouldFilter = true;
	}
	delete this.parent[ this.property ];
}

NodeReference.prototype.modify = function ( obj, surfaceLevel = false ) {
	const ref = this.self;
	if ( surfaceLevel )
		for ( const [ key, value ] of Object.entries( obj ) )
			ref[ key ] = value;
	else deepModify( obj, this.self );
}

NodeReference.prototype.replace = function ( obj ) {
	if ( this.index !== null ) {
		this.shouldFilter = Array.isArray( obj ) || this.shouldFilter;
		return this.parent[ this.property ][ this.index ] = obj;
	}
	return this.parent[ this.property ] = obj;
}

NodeReference.prototype.clone = function () {
	return fastClone( this.self );
}

Object.defineProperty( NodeReference.prototype, 'self', {
	get () {
		if ( this.index !== null )
			return this.parent[ this.property ][ this.index ];
		return this.parent[ this.property ];
	}
} );

function empty () {}

function TraverserInternal ( cbList ) {
	this.cbList = cbList;
	this.all = cbList.all || empty;
}

TraverserInternal.prototype.traverse = function ( node, parent, property, index, ancestors ) {
	// Check if the type exists and if not
	// return false
	if ( !node?.type || typeof node.type !== 'string' )
		return false;

	// Create an ancestor list
	const ancestorList = [ parent ].concat( ancestors );

	// Get a node manager instance and potential call
	let manager = {}, call = this.cbList[ node.type ];
	if ( parent ) manager = new NodeReference( parent, property, ancestorList, index );

	// Call the potential call
	if ( call ) call( node, manager );

	// Call the all caller
	this.all( node, manager );

	// Get traversable properties and traverse
	// through them.
	const traversables = nodeVisitable[ node.type ];
	if ( !traversables ) return false;

	// Start traversing
	for ( const property of traversables ) {
		// Check if the property exists in
		// that node
		if ( !node?.[ property ] )
			continue;

		// Check if the property is NOT iterable
		if ( !node[ property ]?.forEach ) {
			this.traverse( node[ property ], node, property, null, ancestorList );
			continue;
		}

		// Iterate through the property itself
		// and flatten it
		let shouldFilter = false, prNode = node[ property ];
		const { length } = prNode;
		// while ( prNode.length ) {
		//	const element = prNode.shift()
		//	shouldFilter = this.traverse( element, node, property, length - prNode.length, ancestorList );
		// }
		for ( let i = 0; i < length; ++i )
			shouldFilter = this.traverse( prNode[ i ], node, property, i, ancestorList ) || shouldFilter;
		if ( shouldFilter )
			node[ property ] = prNode.flat( Infinity ).filter( e => e );
	}
	if ( manager.onLeave )
		manager.onLeave( node, manager );
	return manager.shouldFilter;
}

TraverserInternal.prototype.watch = function ( node, parent, property, index, ancestors ) {
	// Check if the type exists and if not
	// return false
	if ( !node?.type || typeof node.type !== 'string' )
		return false;

	// Create an ancestor list
	const ancestorList = [ parent ].concat( ancestors );

	// Get a node manager instance and potential call
	let call = this.cbList[ node.type ];

	// Call the potential call
	if ( call ) call( node );

	// Call the all caller
	this.all( node );

	// Get traversable properties and traverse
	// through them.
	const traversables = nodeVisitable[ node.type ];
	if ( !traversables ) return false;

	// Start traversing
	for ( const property of traversables ) {
		// Check if the property exists in
		// that node
		if ( !node?.[ property ] )
			continue;

		// Check if the property is NOT iterable
		if ( !node[ property ]?.forEach ) {
			this.traverse( node[ property ], node, property, null, ancestorList );
			continue;
		}

		// Iterate through the property itself
		// and flatten it
		let prNode = node[ property ]
		const { length } = prNode;
		for ( let i = 0; i < length; ++i )
			this.traverse( prNode[ i ], node, property, i, ancestorList );
	}
}

function traverse ( ast, callback = {}, setup = {} ) {
	// Create a proper callback list.
	let callbackList = callback;
	if ( typeof callback === 'function' )
		callbackList = { all: callback };

	// Clone the AST if required
	if ( !setup.destructive )
		ast = fastClone( ast );

	if ( Object.keys( callback ).length !== 0 )
		( new TraverserInternal( callbackList ) ).traverse( ast, null, null, null, [] );
	return ast;
}

traverse.watch = function ( ast, callback ) {
	// Create a proper callback list.
	let callbackList = callback;
	if ( typeof callback === 'function' )
		callbackList = { all: callback };

	if ( Object.keys( callback ).length !== 0 )
		( new TraverserInternal( callbackList ) ).watch( ast, null, null, null, [] );
	return ast;
}

module.exports = {
	traverse,
	watch: traverse.watch
};
