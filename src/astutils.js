/*
	EStige, a complete AST manipulation toolkit.
	Open-Source, MIT License.

	Copyright (C) 2024 Botaro Shinomiya <nothing@citri.one>

	Given copyright notes are for exclusive rights to go
	beyond the license's limits. For more information, please
	check https://github.com/luskproject/estige/
*/

function isString ( obj ) {
	return typeof obj === 'string';
}

function isNumber ( obj ) {
	return typeof obj === 'number';
}

function isBoolean ( obj ) {
	return typeof obj === 'boolean';
}

function isUndefined ( obj ) {
	return typeof obj === 'undefined';
}

const identifierRegex = /^(?!await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|implements|interface|package|private|protected|public|arguments|eval)[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;

function Literal ( input ) {
	return {
		type: 'Literal',
		value: input,
		raw: isString( input )
			? ( "'" + input.replace( /'/g, "\\'" ) + "'" )
			: input.toString()
	};
}

function Identifier ( input ) {
	return {
		type: 'Identifier',
		name: input
	};
}

function isLiteralPotential ( input ) {
	return input === null || isString( input )
		|| isNumber( input ) || isBoolean( input );
}

function isIdentifierPotential ( input ) {
	return isString( input ) && identifierRegex.test( input );
}

function propertyKey ( input ) {
	if ( isIdentifierPotential( input ) )
		return Identifier( input );
	else if ( isLiteralPotential( input ) )
		return Literal( input );
}

function ObjectExpression ( input ) {
	return {
		type: 'ObjectExpression',
		properties: Object.entries( input ).map(
			( [ key, value ] ) => ( {
				type: 'Property',
				method: false,
				computed: false,
				shorthand: false,
				kind: 'init',
				key: propertyKey( key ),
				value: parse( value )
			} )
		)
	}
}


function ArrayExpression ( input ) {
	return {
		type: 'ArrayExpression',
		elements: input.map( e => parse( e ) )
	}
}

function parse ( input ) {
	if ( isLiteralPotential( input ) )
		return Literal( input );
	if ( isUndefined( input ) )
		return Identifier( 'undefined' );
	if ( Array.isArray( input ) )
		return ArrayExpression( input )
	if ( typeof input === 'object' )
		return ObjectExpression( input );
	throw new Error( `Given type "${ input?.constructor?.name || typeof input }" cannot be converted to an AST node.` );
}

function createVariable ( kind, identifier, expression ) {
	if ( !isIdentifierPotential( identifier ) )
		throw new Error( 'Identifier is not valid.' );
	return {
		type: 'VariableDeclaration',
		kind,
		declarations: [ {
			type: 'VariableDeclarator',
			id: Identifier( identifier ),
			init: parse( expression )
		} ]
	}
}

function createVariables ( kind, items ) {
	return {
		type: 'VariableDeclaration',
		kind,
		declarations: items.map( declaration => ( {
			type: VariableDeclarator,
			id: Identifier( declaration.id ),
			init: parse( declaration.value )
		} ) )
	}
}

module.exports = {
	parse,
	propertyKey,
	createVariable,
	createVariables
}