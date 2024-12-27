/*
	EStige, a complete AST manipulation toolkit.
	Open-Source, MIT License.

	Copyright (C) 2024 Botaro Shinomiya <nothing@citri.one>

	Given copyright notes are for exclusive rights to go
	beyond the license's limits. For more information, please
	check https://github.com/luskproject/estige/
*/

module.exports = {
	Mangler: require( './mangler' ),
	Traverser: require( './traverser' ),
	Optimizer: require( './optimizer' ),
	AST: require( './astutils.js' )
}
