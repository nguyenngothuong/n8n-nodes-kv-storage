import 'reflect-metadata';
import { Service } from 'typedi';
import { IDataObject } from 'n8n-workflow';

const debug = require('debug')('kv-storage');

export enum Scope {
	ALL = 'ALL',
	EXECUTION = 'EXECUTION',
	WORKFLOW = 'WORKFLOW',
	INSTANCE = 'INSTANCE',
}

export enum EventType {
	ANY = 'ANY',
	ADDED = 'added',
	UPDATED = 'updated',
	DELETED = 'deleted',
}

@Service()
export class KvStorageService {
	private map: Record<string, Array<string | number | object | boolean>> = {};
	private mapExpiration: Record<string, number> = {};

	private workflowListenersMap: Record<number, Array<(a: IDataObject) => void>> = {};
	private instanceListeners: Array<(a: IDataObject) => void> = [];
	private executionListeners: Array<(a: IDataObject) => void> = [];

	private allListeners: Array<(a: IDataObject) => void> = [];

	constructor() {
		debug('constructor');
		setInterval(() => {
			debug('setInterval');
			this.deleteExpiredEntries();
		}, 1 * 1000);
	}

	private parseValueIfNeeded(value: string): string | number | object | boolean {
		if (typeof value !== 'string') {
			return value;
		}

		const trimmedValue = value.trim();
		
		// Check if it looks like JSON (starts with { or [)
		if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
			try {
				return JSON.parse(trimmedValue);
			} catch (e) {
				// If parsing fails, return as string
				return value;
			}
		}

		// Check if it's a number
		if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
			const parsed = parseFloat(trimmedValue);
			if (!isNaN(parsed)) {
				return parsed;
			}
		}

		// Check if it's a boolean
		if (trimmedValue === 'true' || trimmedValue === 'false') {
			return trimmedValue === 'true';
		}

		// Return as string if no parsing needed
		return value;
	}

	private deleteExpiredEntries() {
		const expirationKeys = Object.keys(this.mapExpiration);
		debug('deleteExpiredEntries.length=' + expirationKeys.length);

		const expiredKeys = expirationKeys.filter((k) => {
			return this.mapExpiration[k] <= Date.now();
		});

		expiredKeys.map((k) => {
			debug('deleteing expired key=' + k);
			this.deleteKeyWithScopedKey(k);
		});
	}

	listAllKeyValuesInAllScopes(): IDataObject {
		debug('listAllKeyValuesInAllScopes: ');
		const mapKeys = Object.keys(this.map);
		const regExp = /scope:(\w+)-(.+):(.*)/;

		const matchedEntries: IDataObject = {};
		mapKeys
			.filter((scopedKey) => scopedKey.match(regExp))
			.map((scopedKey) => {
				const m = scopedKey.match(regExp);
				//@ts-ignore
				const scope = m[1];
				//@ts-ignore
				const specifier = m[2];
				//@ts-ignore
				const key = m[3];

				const entryKey = `${scope}-${specifier}`;

				if (Object.keys(matchedEntries).includes(entryKey)) {
					//@ts-ignore
					matchedEntries[entryKey].entries[key] = this.map[scopedKey];
				} else {
					const e = {
						scope,
						specifier,
						entries: { [key]: this.map[scopedKey] } as IDataObject,
					} as IDataObject;
					if (Object.keys(this.mapExpiration).includes(scopedKey)) {
						e.expiresAt = this.mapExpiration[scopedKey];
					}
					matchedEntries[entryKey] = e;
				}
			});
		return matchedEntries;
	}

	listAllKeysInScope(scope: Scope, specifier = ''): IDataObject {
		debug('getAllKeysInScope: scope=' + scope + ';specifier=' + specifier);
		const mapKeys = Object.keys(this.map);
		const regExp = new RegExp(`scope\\:${scope}-${specifier}\\:.*`, 'g');

		const matchedKeys = mapKeys
			.filter((scopedKey) => scopedKey.match(regExp))
			.map((scopedKey) => this.getKey(scopedKey));
		return { keys: matchedKeys, scope, specifier };
	}

	listAllKeyValuesInScope(scope: Scope, specifier = ''): IDataObject {
		debug('getAllKeyValuesInScope: scope=' + scope + ';specifier=' + specifier);
		const regExp = new RegExp(`scope\\:${scope}-${specifier}\\:.*`, 'g');
		const mapKeys = Object.keys(this.map);

		const matchedKeys = mapKeys.filter((k) => k.match(regExp));
		const matchedEntries: IDataObject = {};

		matchedKeys.map((sK) => {
			const k = this.getKey(sK);
			matchedEntries[k] = this.map[sK];
		});

		return { entries: matchedEntries, scope, specifier };
	}

	deleteKeyWithScopedKey(scopedKey: string): IDataObject {
		const scopeKeyOf = this.getScope(scopedKey) as keyof typeof Scope;
		const scope = Scope[scopeKeyOf];

		const getSpecifier = this.getSpecifier(scopedKey);
		const key = this.getKey(scopedKey);

		return this.deleteKey(key, scope, getSpecifier);
	}

	deleteKey(key: string, scope: Scope, specifier = ''): IDataObject {
		debug('deleteKey: key=' + key + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);
		const mapKeys = Object.keys(this.map);

		let res = false;
		let val_: Array<string | number | object | boolean> = [];
		const eventType = EventType.DELETED;
		const timestamp = Date.now();

		if (mapKeys.includes(scopedKey)) {
			res = true;
			val_ = this.map[scopedKey];
			delete this.map[scopedKey];
			delete this.mapExpiration[scopedKey];
		}

		const event = {
			eventType,
			scope,
			specifier,
			key,
			val: val_,
			timestamp,
		};
		this.sendEvent(event, scope, specifier);

		return { res };
	}

	getValue(key: string, scope: Scope, specifier = ''): IDataObject {
		debug('getValue: key=' + key + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);
		return { val: this.map[scopedKey] };
	}

	incrementValue(key: string, scope: Scope, specifier = '', ttl = -1): IDataObject {
		debug('incrementValue: key=' + key + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);

		let expiresAt = -1;
		if (ttl > -1) {
			expiresAt = Date.now() + ttl * 1000;
			this.mapExpiration[scopedKey] = expiresAt;
			debug('expiresAt=' + expiresAt);
		}

		const timestamp = Date.now();
		let eventType = EventType.ADDED;
		if (Object.keys(this.map).includes(scopedKey)) {
			eventType = EventType.UPDATED;
		}

		let oldVal = Number(this.map[scopedKey]);
		if (!oldVal || oldVal === undefined) {
			oldVal = 0;
		}
		this.map[scopedKey] = [oldVal + 1];
		const event: IDataObject = {
			eventType,
			scope,
			specifier,
			key,
			val: this.map[scopedKey],
			timestamp,
			expiresAt,
		};

		if (Object.keys(this.map).includes(scopedKey)) {
			event.oldVal = oldVal;
			event.eventType = eventType;
		}

		this.sendEvent(event, scope, specifier);

		return { val: this.map[scopedKey] };
	}

	setValue(key: string, val: string, scope: Scope, specifier = '', ttl = -1): IDataObject {
		debug('setValue: key=' + key + ';val=' + val + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);

		let expiresAt = -1;
		if (ttl > -1) {
			expiresAt = Date.now() + ttl * 1000;
			this.mapExpiration[scopedKey] = expiresAt;
			debug('expiresAt=' + expiresAt);
		}

		const timestamp = Date.now();
		let eventType = EventType.ADDED;
		if (Object.keys(this.map).includes(scopedKey)) {
			eventType = EventType.UPDATED;
		}
		const oldVal = this.map[scopedKey];
		const parsedValue = this.parseValueIfNeeded(val);
		this.map[scopedKey] = val === '' || val === null || val === undefined ? [] : [parsedValue];
		const event: IDataObject = {
			eventType,
			scope,
			specifier,
			key,
			val: this.map[scopedKey],
			timestamp,
			expiresAt,
		};

		if (Object.keys(this.map).includes(scopedKey)) {
			event.oldVal = oldVal;
			event.eventType = eventType;
		}

		this.sendEvent(event, scope, specifier);

		return { val: this.map[scopedKey] };
	}

	insertToList(key: string, elementValue: string, insertPosition: string, insertIndex: number, scope: Scope, specifier = '', ttl = -1): IDataObject {
		debug('insertToList: key=' + key + ';elementValue=' + elementValue + ';insertPosition=' + insertPosition + ';insertIndex=' + insertIndex + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);

		if (!Object.keys(this.map).includes(scopedKey)) {
			// Auto-create key only for EXECUTION scope
			if (scope === Scope.EXECUTION) {
				debug('Auto-creating key for EXECUTION scope: ' + key);
				this.map[scopedKey] = [];
			} else {
				return { error: 'Key does not exist. Use setValue to create it first. (Auto-create only works with EXECUTION scope)' };
			}
		}

		let expiresAt = -1;
		if (ttl > -1) {
			expiresAt = Date.now() + ttl * 1000;
			this.mapExpiration[scopedKey] = expiresAt;
			debug('expiresAt=' + expiresAt);
		}

		const currentList = [...this.map[scopedKey]];
		const oldVal = [...this.map[scopedKey]];
		const parsedElementValue = this.parseValueIfNeeded(elementValue);

		switch (insertPosition) {
			case 'beginning':
				currentList.unshift(parsedElementValue);
				break;
			case 'end':
				currentList.push(parsedElementValue);
				break;
			case 'index':
				if (insertIndex < 0 || insertIndex > currentList.length) {
					return { error: 'Index out of bounds. Index must be between 0 and ' + currentList.length };
				}
				currentList.splice(insertIndex, 0, parsedElementValue);
				break;
			default:
				return { error: 'Invalid insert position. Use beginning, end, or index.' };
		}

		this.map[scopedKey] = currentList;

		const timestamp = Date.now();
		const event: IDataObject = {
			eventType: EventType.UPDATED,
			scope,
			specifier,
			key,
			val: currentList,
			oldVal,
			timestamp,
			expiresAt,
		};

		this.sendEvent(event, scope, specifier);

		return { val: this.map[scopedKey], inserted: parsedElementValue, position: insertPosition, index: insertPosition === 'index' ? insertIndex : undefined };
	}

	removeFromListByPosition(key: string, removePosition: string, removeIndex: number, scope: Scope, specifier = '', ttl = -1): IDataObject {
		debug('removeFromListByPosition: key=' + key + ';removePosition=' + removePosition + ';removeIndex=' + removeIndex + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);

		if (!Object.keys(this.map).includes(scopedKey)) {
			return { error: 'Key does not exist.' };
		}

		if (!Array.isArray(this.map[scopedKey]) || this.map[scopedKey].length === 0) {
			return { error: 'List is empty.' };
		}

		let expiresAt = -1;
		if (ttl > -1) {
			expiresAt = Date.now() + ttl * 1000;
			this.mapExpiration[scopedKey] = expiresAt;
			debug('expiresAt=' + expiresAt);
		}

		const currentList = [...this.map[scopedKey]];
		const oldVal = [...this.map[scopedKey]];
		let removedElement: string | number | object | boolean | undefined;

		switch (removePosition) {
			case 'beginning':
				removedElement = currentList.shift();
				break;
			case 'end':
				removedElement = currentList.pop();
				break;
			case 'index':
				if (removeIndex < 0 || removeIndex >= currentList.length) {
					return { error: 'Index out of bounds. Index must be between 0 and ' + (currentList.length - 1) };
				}
				removedElement = currentList.splice(removeIndex, 1)[0];
				break;
			default:
				return { error: 'Invalid remove position. Use beginning, end, or index.' };
		}

		this.map[scopedKey] = currentList;

		const timestamp = Date.now();
		const event: IDataObject = {
			eventType: EventType.UPDATED,
			scope,
			specifier,
			key,
			val: currentList,
			oldVal,
			timestamp,
			expiresAt,
		};

		this.sendEvent(event, scope, specifier);

		return { val: this.map[scopedKey], removed: removedElement, position: removePosition, index: removePosition === 'index' ? removeIndex : undefined };
	}

	removeFromListByValue(key: string, removeValue: string, removeAll: boolean, scope: Scope, specifier = '', ttl = -1): IDataObject {
		debug('removeFromListByValue: key=' + key + ';removeValue=' + removeValue + ';removeAll=' + removeAll + ';scope=' + scope + ';specifier=' + specifier);
		const scopedKey = this.composeScopeKey(key, scope, specifier);

		if (!Object.keys(this.map).includes(scopedKey)) {
			return { error: 'Key does not exist.' };
		}

		if (!Array.isArray(this.map[scopedKey]) || this.map[scopedKey].length === 0) {
			return { error: 'List is empty.' };
		}

		let expiresAt = -1;
		if (ttl > -1) {
			expiresAt = Date.now() + ttl * 1000;
			this.mapExpiration[scopedKey] = expiresAt;
			debug('expiresAt=' + expiresAt);
		}

		const currentList = [...this.map[scopedKey]];
		const oldVal = [...this.map[scopedKey]];
		const parsedRemoveValue = this.parseValueIfNeeded(removeValue);
		const removedElements: Array<string | number | object | boolean> = [];

		// Convert to JSON strings for deep comparison
		const targetValueStr = JSON.stringify(parsedRemoveValue);
		
		if (removeAll) {
			// Remove all matching values
			this.map[scopedKey] = currentList.filter(item => {
				const itemStr = JSON.stringify(item);
				if (itemStr === targetValueStr) {
					removedElements.push(item);
					return false;
				}
				return true;
			});
		} else {
			// Remove only the first matching value
			const index = currentList.findIndex(item => JSON.stringify(item) === targetValueStr);
			if (index !== -1) {
				removedElements.push(currentList[index]);
				currentList.splice(index, 1);
				this.map[scopedKey] = currentList;
			}
		}

		if (removedElements.length === 0) {
			return { error: 'Value not found in list.' };
		}

		const timestamp = Date.now();
		const event: IDataObject = {
			eventType: EventType.UPDATED,
			scope,
			specifier,
			key,
			val: this.map[scopedKey],
			oldVal,
			timestamp,
			expiresAt,
		};

		this.sendEvent(event, scope, specifier);

		return { 
			val: this.map[scopedKey], 
			removed: removeAll ? removedElements : removedElements[0], 
			removedCount: removedElements.length,
		};
	}

	private sendEvent(event: IDataObject, scope: Scope, specifier: string) {
		if (this.allListeners.length > 0) {
			this.allListeners.map((callback) => callback(event));
		}

		if (scope === Scope.INSTANCE && this.instanceListeners.length > 0) {
			this.instanceListeners.map((callback) => callback(event));
		}

		if (scope === Scope.EXECUTION && this.executionListeners.length > 0) {
			this.executionListeners.map((callback) => callback(event));
		}
		if (scope === Scope.WORKFLOW) {
			Object.keys(this.workflowListenersMap).map((k) => {
				if (specifier === k) {
					this.workflowListenersMap[Number(k)].map((callback) => callback(event));
				}
			});
		}
	}

	private composeScopeKey(key: string, scope: Scope, specifier = ''): string {
		debug('composeScopeKey: key=' + key + ';scope=' + scope + ';specifier=' + specifier);
		if (scope === Scope.EXECUTION) {
			return `scope:${scope}-${specifier}:${key}`;
		} else if (scope === Scope.WORKFLOW) {
			return `scope:${scope}-${specifier}:${key}`;
		} else if (scope === Scope.INSTANCE) {
			// specifier =
			return `scope:${scope}-${specifier}:${key}`;
		}
		const scopedKey = `scope:${scope}:${key}`;
		debug('scopedKey=' + scopedKey);
		return scopedKey;
	}

	private getKey(scopedKey: string): string {
		const match = scopedKey.match(/scope:\w+-.*:(.*)/);
		return match !== null ? match[1] : 'EMPTY';
	}

	private getScope(scopedKey: string): string {
		const match = scopedKey.match(/scope:(\w+)-.*:.*/);
		return match !== null ? match[1] : 'EMPTY';
	}

	private getSpecifier(scopedKey: string): string {
		const match = scopedKey.match(/scope:\w+-(.*):.*/);
		return match !== null ? match[1] : 'EMPTY';
	}

	addListener(scope: Scope, specifier: string, callback: (a: IDataObject) => void) {
		debug('addListener: scope=' + scope + ';specifier=' + specifier);
		if (scope === Scope.WORKFLOW) {
			const workflowListenersMapKeys = Object.keys(this.workflowListenersMap);
			debug('workflowListenersMapKeys: ' + workflowListenersMapKeys);

			const keys = specifier
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);

			keys.map((key) => {
				if (!workflowListenersMapKeys.includes(key)) {
					debug('initialized with callback');
					this.workflowListenersMap[Number(key)] = [callback];
				} else {
					debug('pushed callback');
					this.workflowListenersMap[Number(key)].push(callback);
				}
			});
		} else if (scope === Scope.EXECUTION) {
			debug('pushed callback');
			this.executionListeners.push(callback);
			debug('this.executionListeners.length=' + this.executionListeners.length);
		} else if (scope === Scope.INSTANCE) {
			debug('pushed callback');
			this.instanceListeners.push(callback);
			debug('this.instanceListeners.length=' + this.instanceListeners.length);
		} else if (scope === Scope.ALL) {
			debug('pushed callback');
			this.allListeners.push(callback);
			debug('this.allListeners.length=' + this.allListeners.length);
		}
	}

	removeListener(scope: Scope, specifier: string, callback: (a: IDataObject) => void) {
		debug('removeListener: scope=' + scope + ';specifier=' + specifier);
		if (scope === Scope.WORKFLOW) {
			const workflowListenersMapKeys = Object.keys(this.workflowListenersMap);

			const keys = specifier
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);

			keys.map((key) => {
				if (workflowListenersMapKeys.includes(key)) {
					debug(
						'this.workflowListenersMap[' +
							key +
							'].length=' +
							this.workflowListenersMap[Number(key)].length,
					);
					this.workflowListenersMap[Number(key)] = this.workflowListenersMap[Number(key)].filter(
						(cb) => cb !== callback,
					);
					debug(
						'this.workflowListenersMap[' +
							key +
							'].length=' +
							this.workflowListenersMap[Number(key)].length,
					);
				}
			});
		} else if (scope === Scope.EXECUTION) {
			debug('this.executionListeners.length=' + this.executionListeners.length);
			this.executionListeners = this.executionListeners.filter((cb) => cb !== callback);
			debug('this.executionListeners.length=' + this.executionListeners.length);
		} else if (scope === Scope.INSTANCE) {
			debug('this.instanceListeners.length=' + this.instanceListeners.length);
			this.instanceListeners = this.instanceListeners.filter((cb) => cb !== callback);
			debug('this.instanceListeners.length=' + this.instanceListeners.length);
		} else if (scope === Scope.ALL) {
			debug('this.allListeners.length=' + this.allListeners.length);
			this.allListeners = this.allListeners.filter((cb) => cb !== callback);
			debug('this.allListeners.length=' + this.allListeners.length);
		}
	}
}
