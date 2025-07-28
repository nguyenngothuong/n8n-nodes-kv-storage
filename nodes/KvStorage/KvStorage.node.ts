import 'reflect-metadata';
import { IExecuteFunctions } from 'n8n-core';

import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { Container } from 'typedi';
import { KvStorageService, Scope } from './KvStorageService';

export class KvStorage implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Key-Value Storage',
		name: 'kvStorage',
		icon: 'file:KvStorage.svg',
		group: ['storage'],
		version: 1,
		description: 'Key-Value Storage Getter and Setter',
		defaults: {
			name: 'KVStorage',
		},

		credentials: [],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get Value by Key in Scope',
						value: 'getValue',
						action: 'Get value by key in scope',
					},
					{
						name: 'Increment Value by Key in Scope. Create Key if It Does Not Exist',
						value: 'incrementValue',
						action: 'Increment value by key in scope create key if it does not exist',
					},
					{
						name: 'Insert Element Into List',
						value: 'insertToList',
						action: 'Insert element into existing list variable',
					},
					{
						name: 'List All Keys in Scope',
						value: 'listAllScopeKeys',
						action: 'List all keys in scope',
					},
					{
						name: 'List All KeyValues in ALL Scopes',
						value: 'listAllKeyValuesInAllScopes',
						action: 'Get all values and keys in all scopes debug',
					},
					{
						name: 'List All KeyValues in Scope',
						value: 'listAllKeyValues',
						action: 'List all values and keys in scope',
					},
					{
						name: 'Set Value for Key in Scope',
						value: 'setValue',
						action: 'Set value for key in scope',
					},
				],
				default: 'getValue',
				noDataExpression: true,
			},

			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'listAllKeyValues',
							'listAllScopeKeys',
							'getValue',
							'setValue',
							'incrementValue',
							'insertToList',
						],
					},
				},
				options: [
					{
						name: 'ALL Scopes',
						value: Scope.ALL,
					},
					{
						name: 'Execution Scope',
						value: Scope.EXECUTION,
					},
					{
						name: 'Workflow Scope',
						value: Scope.WORKFLOW,
					},
					{
						name: 'Instance Scope',
						value: Scope.INSTANCE,
					},
				],
				default: 'WORKFLOW',
			},

			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['getValue', 'setValue', 'incrementValue', 'insertToList'],
					},
				},
				default: '',
				placeholder: 'my-example-key',
			},

			{
				displayName: 'Value',
				name: 'val',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['setValue'],
					},
				},
				default: '',
				placeholder: 'my-example-value',
				description: 'Value to store. Supports JSON objects, arrays, numbers, booleans, and strings. Leave empty to create an empty array.',
			},

			{
				displayName: 'Element Value',
				name: 'elementValue',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['insertToList'],
					},
				},
				default: '',
				placeholder: 'Element to insert',
				description: 'Value to insert into the list. Supports JSON objects, arrays, numbers, booleans, and strings.',
			},

			{
				displayName: 'Insert Position',
				name: 'insertPosition',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['insertToList'],
					},
				},
				options: [
					{
						name: 'At Beginning',
						value: 'beginning',
					},
					{
						name: 'At End',
						value: 'end',
					},
					{
						name: 'At Index',
						value: 'index',
					},
				],
				default: 'end',
				description: 'Where to insert the element in the list',
			},

			{
				displayName: 'Index',
				name: 'insertIndex',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						operation: ['insertToList'],
						insertPosition: ['index'],
					},
				},
				default: 0,
				description: 'Index position to insert at (0-based)',
			},

			{
				displayName: 'ExecutionId',
				name: 'executionId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['listAllKeyValues', 'listAllScopeKeys', 'getValue', 'setValue', 'insertToList'],
						scope: [Scope.EXECUTION],
					},
				},
				default: '={{ $execution.id }}',
				placeholder: '={{ $execution.ID }}',
				description: 'Do not change this - this is unique identifier of Execution',
			},
			{
				displayName: 'Expire',
				name: 'expire',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['setValue', 'incrementValue', 'insertToList'],
					},
				},
				default: true,
				description: 'Whether to set a timeout on key',
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						operation: ['setValue', 'incrementValue', 'insertToList'],
						expire: [true],
					},
				},
				default: 60,
				description: 'Number of seconds before key expiration',
			},
		],
	};
	// The execute method will go here

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		let specifier = '';
		let scope = Scope.ALL;

		try {
			const scopeVar = this.getNodeParameter('scope', 0) as keyof typeof Scope;
			scope = Scope[scopeVar];
			switch (scope) {
				case Scope.EXECUTION:
					specifier = this.getNodeParameter('executionId', 0) as string;
					break;
				case Scope.WORKFLOW:
					specifier = this.getWorkflow().id as string;
					break;
				case Scope.INSTANCE:
					specifier = 'N8N';
					break;
				default:
					break;
			}
		} catch (e) {
			//no scope provided, we are in 'listAllKeyValuesInAllScopes' option
		}

		const service = Container.get(KvStorageService);

		if (operation === 'listAllKeyValuesInAllScopes') {
			const result = service.listAllKeyValuesInAllScopes();
			returnData.push(result);
		} else if (operation === 'listAllScopeKeys') {
			const result = service.listAllKeysInScope(scope, specifier);
			returnData.push(result);
		} else if (operation === 'listAllKeyValues') {
			const result = service.listAllKeyValuesInScope(scope, specifier);
			returnData.push(result);
		} else if (operation === 'getValue') {
			const key = this.getNodeParameter('key', 0) as string;

			const result = service.getValue(key, scope, specifier);
			returnData.push(result);
		} else if (operation === 'setValue') {
			const key = this.getNodeParameter('key', 0) as string;
			const val = this.getNodeParameter('val', 0, '') as string;
			const ttl = this.getNodeParameter('ttl', 0, -1) as number;

			const result = service.setValue(key, val, scope, specifier, ttl);
			returnData.push(result);
		} else if (operation === 'incrementValue') {
			const key = this.getNodeParameter('key', 0) as string;
			const ttl = this.getNodeParameter('ttl', 0, -1) as number;

			const result = service.incrementValue(key, scope, specifier, ttl);
			returnData.push(result);
		} else if (operation === 'insertToList') {
			const key = this.getNodeParameter('key', 0) as string;
			const elementValue = this.getNodeParameter('elementValue', 0) as string;
			const insertPosition = this.getNodeParameter('insertPosition', 0) as string;
			const insertIndex = this.getNodeParameter('insertIndex', 0, 0) as number;
			const ttl = this.getNodeParameter('ttl', 0, -1) as number;

			const result = service.insertToList(key, elementValue, insertPosition, insertIndex, scope, specifier, ttl);
			returnData.push(result);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
