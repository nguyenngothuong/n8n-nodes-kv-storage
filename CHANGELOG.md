
## 0.2.0
- **NEW**: Automatic JSON parsing for objects and arrays
- **NEW**: Automatic type conversion for numbers and booleans
- **IMPROVED**: setValue and insertToList now handle JSON objects intelligently
- **IMPROVED**: Values are now stored in their proper data types instead of strings

## 0.1.3
- **FIXED**: Empty values now return empty array `[]` instead of `[""]`
- **IMPROVED**: Better handling of null, undefined, and empty string values

## 0.1.2
- **FIXED**: Allow setting null/empty values in setValue operation
- **IMPROVED**: Value parameter is no longer required, allowing empty values
- **IMPROVED**: Added description to clarify empty values are allowed

## 0.1.1
- **FIXED**: Fixed node path configuration to match actual directory structure

## 0.1.0
- **NEW**: Added `insertToList` action for inserting elements into existing list variables
- **NEW**: Support for three insert positions: At Beginning, At End, At Index
- **NEW**: Index validation to prevent out-of-bounds errors
- **IMPROVED**: Better organized README with categorized actions (Basic, List, Query)
- **IMPROVED**: Enhanced error handling for list operations

## 0.0.1
- implemented scopes (EXECUTION, WORKFLOW, INSTANCE)
- implemented actions: getValue, setValue, incrementValue, listAllScopeKeys, listAllKeyValues, listAllKeyValuesInAllScopes
- Expires / TTL parameter is active by default in setValue action: you can disable it if you would like this key/value to be persisted until n8n restart
- key/value pairs that have TTL set will be automatically deleted after they expire
- automatic deletion task is running in background every 1 second
- Trigger node is listening for key/value update events in different scopes
- Trigger node allows filtering by eventType ( value was added, edited, deleted)
