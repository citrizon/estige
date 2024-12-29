/*
	EStige, a complete AST manipulation toolkit.
	Open-Source, MIT License.

	Copyright (C) 2024 Botaro Shinomiya <nothing@citri.one>

	Given copyright notes are for exclusive rights to go
	beyond the license's limits. For more information, please
	check https://github.com/luskproject/estige/
*/

const traverser = require( './traverser' );
const { parse } = require( './astutils' );

function Value ( ast ) {
	if (
		ast?.type === 'Identifier' &&
		ast.name === 'undefined'
	) return undefined;
	if ( ast?.type === 'Literal' )
		return ast.value
	return None;
}

const None = Symbol( 'None' );

const Operations = {
	BinaryExpression ( ast ) {
		if ( !Operations[ ast.left.type ] || !Operations[ ast.right.type ] )
			return None;
		const left = Operations[ ast.left.type ]( ast.left ),
			right = Operations[ ast.right.type ]( ast.right );
		if ( left === None || right === None )
			return None;

		ast.left = parse( left );
		ast.right = parse( right );
		if ( ast.operator === '==' )
			return right == left;
		if ( ast.operator === '===' )
			return right  === left;
		if ( ast.operator === '*' )
			return right * left;
		if ( ast.operator === '**' )
			return right ** left;
		if ( ast.operator === '+' )
			return right + left;
		if ( ast.operator === '-' )
			return right - left;
		if ( ast.operator === '/' )
			return right / left;
		if ( ast.operator === '|' )
			return right | left;
		if ( ast.operator === '&' )
			return right & left;
		if ( ast.operator === '<' )
			return right < left;
		if ( ast.operator === '>' )
			return right > left;
		if ( ast.operator === '>=' )
			return right >= left;
		if ( ast.operator === '<=' )
			return right <= left;
		return None;
	},
	LogicalExpression ( ast ) {
		if ( !Operations[ ast.left.type ] || !Operations[ ast.right.type ] )
			return None;
		const left = Operations[ ast.left.type ]( ast.left ),
			right = Operations[ ast.right.type ]( ast.right );
		if ( left === None || right === None )
			return None;
		if ( ast.operator === '&&' )
			return right && left;
		if ( ast.operator === '||' )
			return right || left;
		return None;
	},
	Identifier: Value,
	Literal: Value
}

function optimizeIfStatement ( ast, manager ) {
	const operator = Operations[ ast.test?.type ];
	if ( operator ) {
		const data = operator( ast.test );
		if ( data === None )
			return;
		ast.test = parse( data );
		if ( data )
			manager.replace( ast.consequent?.type === 'BlockStatement'
				? ast.consequent.body : ast.consequent );
		else if ( ast.alternate )
			manager.replace( ast.alternate?.type === 'BlockStatement'
				? ast.alternate.body : ast.alternate);
	};
}

function optimizeBlockStatement ( node, manager ) {
	manager.onLeave = () => {
		let shouldPass = true;
		node.body = node.body.filter( subNode => {
			if ( subNode.type === 'ReturnStatement' )
				return shouldPass == false ? false : !( shouldPass = false );
			return shouldPass;
		} );
	}
}

function optimize ( ast ) {
	return traverser.traverse( ast, {
		// Let's clear up things
		ExpressionStatement ( node, manager ) {
			if ( node.expression?.value === 'use strict' )
				// Remove "use strict" directive
				return manager.remove();
			if ( node.expression?.operator === 'void' )
				// We are an expression statement, so the
				// value is ignored. To keep stability, we
				// are going to keep the expression.
				return manager.modify( { operator: '!' } );
		},
		IfStatement: optimizeIfStatement,
		BlockStatement: optimizeBlockStatement,
	} )
}

module.exports = {
	optimize
}
