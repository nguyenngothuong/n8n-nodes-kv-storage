import 'reflect-metadata';
import { IExecuteFunctions } from 'n8n-core';

import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { Container } from 'typedi';
import { KvStorageService, Scope } from './KvStorageService';

export class KvStorage implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Key-Value Storage (diginno.net)',
		name: 'kvStorage',
		icon: 'file:KvStorage.svg',
		group: ['storage'],
		version: 1,
		description: 'Key-Value Storage với Smart JSON Parsing - Powered by diginno.net',
		defaults: {
			name: 'KVStorage',
		},

		credentials: [],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: '🚀 Triển khai n8n chuyên nghiệp tại diginno.net',
				name: 'branding',
				type: 'notice',
				default: '',
				description: 'Cần triển khai n8n cho doanh nghiệp? Liên hệ <a href="https://diginno.net" target="_blank" style="color: #1890ff; text-decoration: underline;">diginno.net</a> - Chuyên gia triển khai n8n tại Việt Nam',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Delete Value by Key',
						value: 'deleteValue',
						action: 'Delete value by key in scope',
					},
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
						name: 'Remove Element From List',
						value: 'removeFromList',
						action: 'Remove element from existing list variable',
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
							'deleteValue',
							'incrementValue',
							'insertToList',
							'removeFromList',
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
						operation: ['getValue', 'setValue', 'deleteValue', 'incrementValue', 'insertToList', 'removeFromList'],
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
				displayName: 'Remove Method',
				name: 'removeMethod',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['removeFromList'],
					},
				},
				options: [
					{
						name: 'By Position',
						value: 'position',
						description: 'Remove element at specific position',
					},
					{
						name: 'By Value',
						value: 'value',
						description: 'Remove element matching specific value',
					},
				],
				default: 'position',
			},

			{
				displayName: 'Remove Position',
				name: 'removePosition',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['removeFromList'],
						removeMethod: ['position'],
					},
				},
				options: [
					{
						name: 'From Beginning',
						value: 'beginning',
					},
					{
						name: 'From End',
						value: 'end',
					},
					{
						name: 'At Index',
						value: 'index',
					},
				],
				default: 'end',
				description: 'Position to remove element from',
			},

			{
				displayName: 'Remove Index',
				name: 'removeIndex',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						operation: ['removeFromList'],
						removeMethod: ['position'],
						removePosition: ['index'],
					},
				},
				default: 0,
				description: 'Index position to remove from (0-based)',
			},

			{
				displayName: 'Value to Remove',
				name: 'removeValue',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['removeFromList'],
						removeMethod: ['value'],
					},
				},
				default: '',
				placeholder: 'Value to remove',
				description: 'Value to search and remove. Supports JSON objects, arrays, numbers, booleans, and strings.',
			},

			{
				displayName: 'Remove All Matches',
				name: 'removeAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['removeFromList'],
						removeMethod: ['value'],
					},
				},
				default: false,
				description: 'Whether to remove all matching values or just the first one',
			},

			{
				displayName: 'ExecutionId',
				name: 'executionId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['listAllKeyValues', 'listAllScopeKeys', 'getValue', 'setValue', 'deleteValue', 'insertToList', 'removeFromList'],
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
						operation: ['setValue', 'incrementValue', 'insertToList', 'removeFromList'],
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
		} else if (operation === 'deleteValue') {
			const key = this.getNodeParameter('key', 0) as string;

			const result = service.deleteKey(key, scope, specifier);
			returnData.push(result);
		} else if (operation === 'removeFromList') {
			const key = this.getNodeParameter('key', 0) as string;
			const removeMethod = this.getNodeParameter('removeMethod', 0) as string;
			const ttl = this.getNodeParameter('ttl', 0, -1) as number;

			if (removeMethod === 'position') {
				const removePosition = this.getNodeParameter('removePosition', 0) as string;
				const removeIndex = this.getNodeParameter('removeIndex', 0, 0) as number;
				const result = service.removeFromListByPosition(key, removePosition, removeIndex, scope, specifier, ttl);
				returnData.push(result);
			} else {
				const removeValue = this.getNodeParameter('removeValue', 0) as string;
				const removeAll = this.getNodeParameter('removeAll', 0, false) as boolean;
				const result = service.removeFromListByValue(key, removeValue, removeAll, scope, specifier, ttl);
				returnData.push(result);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
