# n8n-nodes-kv-storage

Node mạnh mẽ cho [n8n](https://www.n8n.io) - hệ thống lưu trữ key-value thông minh với tự động chuyển đổi kiểu dữ liệu và thao tác danh sách.

## ✨ Tính năng nổi bật

- 🚀 **Nhận dạng kiểu dữ liệu thông minh**: Tự động chuyển đổi JSON objects, arrays, numbers và booleans
- 📋 **Thao tác danh sách**: Chèn phần tử vào danh sách với vị trí linh hoạt
- 🔄 **Đa phạm vi lưu trữ**: Execution, Workflow và Instance-level storage
- ⏰ **Hỗ trợ TTL**: Tự động hết hạn với thời gian có thể cấu hình
- 🎯 **Hệ thống sự kiện**: Trigger thời gian thực cho thay đổi dữ liệu
- 💾 **Lưu trữ trong bộ nhớ**: Truy cập nhanh không cần phụ thuộc bên ngoài

Hoàn hảo cho workflows khi Database hoặc Redis quá phức tạp, và `StaticData` hoặc `Code` nodes không đủ mạnh.

## 🚀 Cài đặt nhanh

Cài đặt node:
```bash
npm install n8n-nodes-kv-storage
```

`KV Storage` tổ chức dữ liệu thành các nhóm phạm vi (scoped buckets) cho các trường hợp sử dụng khác nhau.

### Thiết lập n8n được khuyến nghị

Node này nên được sử dụng với `EXECUTION_PROCESS=main`.

Bạn cũng có thể chạy ở chế độ `own`, nhưng khi đó chỉ có EXECUTION scope hoạt động, vì n8n khởi động mỗi execution trong process riêng biệt và các process này không chia sẻ dữ liệu.

Nếu bạn cố ý sử dụng chế độ `own`, hãy cân nhắc sử dụng Redis thay vì `KV Storage` node.

Điều tương tự áp dụng cho thiết lập multi-node: bạn nên cân nhắc sử dụng Redis, vì `KV Storage` không có backend và lưu trữ tất cả dữ liệu trong bộ nhớ của một node n8n duy nhất.

## 🎯 Các phạm vi lưu trữ (Scopes)

### Execution

Giá trị đặt trong scope này chỉ có thể đọc được bởi các nodes trong cùng một Workflow Execution.

Nhiều Execution scopes có thể tồn tại đồng thời: Chúng tôi phân biệt giữa các scope của các executions khác nhau bằng cách sử dụng `{{ $execution.id }}`

Điều này được khuyến nghị cho các giá trị tồn tại ngắn hạn, như bộ đếm vòng lặp, tính toán chỉ số, hoặc chuỗi cần được kết hợp lại với nhau.

Hãy cân nhắc giữ tham số `Expires` / `TTL` cho các giá trị như vậy, vì nếu không các entries này sẽ không bao giờ bị xóa và có thể tăng mức tiêu thụ bộ nhớ của process n8n của bạn.

### Workflow

Giá trị có phạm vi `Workflow` sẽ có thể truy cập được từ mọi node trong cùng workflow (với điều kiện WorkflowID không thay đổi) trong **mọi** Workflow Execution.

Nhiều Workflow scopes có thể tồn tại đồng thời: Chúng tôi phân biệt giữa các scope của các executions khác nhau bằng cách sử dụng `workflowId`

Bạn có thể sử dụng scope này để lưu trữ một số trạng thái tạm thời cần được chia sẻ giữa các executions khác nhau.

Tham số `Expires` / `TTL` được bật theo mặc định, nhưng bạn có thể tắt nó nếu không muốn các giá trị của mình tự động bị xóa khi hết hạn.

### Instance

Đây là phạm vi toàn cục: các giá trị đặt ở đây sẽ được chia sẻ giữa tất cả workflows n8n chạy trên một node n8n duy nhất.

Chỉ có một Instance scope: chúng tôi không sử dụng bất kỳ specifier nào.

### Cluster

Scope này chưa được triển khai.

Các giá trị có phạm vi Cluster sẽ có thể truy cập được từ mọi node trong cluster n8n.

## 🛠️ Các thao tác của Node

### Thao tác cơ bản

#### setValue

Đặt giá trị dựa trên key, Scope (Execution/Workflow/Instance) và specifier/ID của Scope.

**🎯 Chuyển đổi kiểu dữ liệu thông minh**: Tự động nhận dạng và chuyển đổi:
- JSON objects: `{"user": {"id": 1}}` → Cấu trúc object sạch sẽ
- Arrays: `["item1", "item2"]` → Định dạng array chính xác  
- Numbers: `"42"` → `42`
- Booleans: `"false"` → `false`
- Giá trị rỗng: `""` → `[]` (array rỗng cho thao tác danh sách)

Tham số `Expires` / `TTL` có thể được sử dụng nếu các giá trị cần được tự động xóa sau một thời gian.

Gửi events `added` hoặc `updated` có thể được lắng nghe bằng `KV Storage Trigger` node.

#### getValue

Trả về giá trị dựa trên Scope, Scope specifier và key.

#### incrementValue

Tăng giá trị dựa trên key, Scope (Execution/Workflow/Instance) và specifier/ID của Scope.
Nếu giá trị chưa được đặt trước đó, nó sẽ được khởi tạo với `1`.

Tham số `Expires` / `TTL` có thể được sử dụng nếu các giá trị cần được tự động xóa sau một thời gian.

Gửi events `added` hoặc `updated` có thể được lắng nghe bằng `KV Storage Trigger` node.

### Thao tác danh sách

#### insertToList

Chèn một phần tử vào biến có giá trị danh sách. Key phải đã tồn tại (được tạo bằng setValue).

**🎯 Chuyển đổi kiểu dữ liệu thông minh**: Tự động nhận dạng và chuyển đổi:
- JSON objects: `{"name": "John"}` → `{name: "John"}`
- Arrays: `[1, 2, 3]` → `[1, 2, 3]`
- Numbers: `"123"` → `123`
- Booleans: `"true"` → `true`

**Vị trí chèn:**
- **At Beginning**: Chèn phần tử vào đầu danh sách
- **At End**: Chèn phần tử vào cuối danh sách  
- **At Index**: Chèn phần tử tại vị trí cụ thể (chỉ số bắt đầu từ 0)

Tham số `Expires` / `TTL` có thể được sử dụng nếu các giá trị cần được tự động xóa sau một thời gian.

Gửi events `updated` có thể được lắng nghe bằng `KV Storage Trigger` node.

### Thao tác truy vấn

#### listAllScopeKeys

Trả về tất cả keys trong một Scope.

#### listAllKeyValues

Trả về tất cả entries (cặp key/value) trong một Scope.

#### Debug: listAllKeyValuesInAllScopes

Trả về tất cả entries (cặp key/value) trong tất cả Scope.

## ⏰ TTL và xóa giá trị

Nếu các tham số `Expires` / `TTL` được cung cấp khi giá trị được đặt, các giá trị này sẽ được tự động xóa sau khi hết hạn.

Công việc xóa được lên lịch chạy mỗi `1000ms`.

Công việc xóa gửi events `deleted` cho mọi key bị xóa. Bạn có thể lắng nghe event này bằng `KV Storage Trigger` node.

## 🔔 Trigger Node

Với `KV Storage Trigger` node, bạn có thể lắng nghe các events `added`, `edited` và `deleted` trong các scope tương ứng.

Nếu bạn chọn Workspace scope, bạn phải cung cấp workflowId (hoặc danh sách workflowIds được phân tách bằng dấu phẩy) sẽ được quan sát.

## 📝 Ví dụ sử dụng

### Lưu trữ Object thông minh
```javascript
// Input (dưới dạng string)
'{"user": {"name": "John", "age": 30}, "active": true}'

// Tự động chuyển đổi thành:
{
  user: { name: "John", age: 30 },
  active: true
}
```

### Xây dựng danh sách động
```javascript
// 1. Khởi tạo danh sách rỗng
setValue: key="users", value="" → []

// 2. Thêm objects vào danh sách
insertToList: key="users", value='{"id": 1, "name": "Alice"}' 
// Kết quả: [{ id: 1, name: "Alice" }]

insertToList: key="users", value='{"id": 2, "name": "Bob"}' 
// Kết quả: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
```

### Chia sẻ dữ liệu giữa các Workflow
```javascript
// Workflow A: Lưu trữ dữ liệu
setValue: scope="WORKFLOW", key="shared_config", value='{"api_url": "https://api.example.com"}'

// Workflow B: Lấy dữ liệu  
getValue: scope="WORKFLOW", key="shared_config"
// Trả về: { api_url: "https://api.example.com" }
```

## 🔧 Đóng góp và phát triển

Để test node này trên cài đặt npm local, bạn có thể sử dụng lệnh `make run`.

Bạn cũng có thể sử dụng target `make prepublish` để tự động format và lint-fix code trước khi submit thay đổi.

Vui lòng tham khảo `Makefile`.

## 💖 Ủng hộ dự án này

Nếu node này đã giúp tối ưu hóa workflows n8n của bạn và tiết kiệm thời gian phát triển, hãy cân nhắc ủng hộ để tiếp tục phát triển!

### Tại sao nên ủng hộ?

- 🔧 **Bảo trì tích cực**: Cập nhật thường xuyên và sửa lỗi
- ✨ **Tính năng mới**: Cải tiến chức năng và hiệu suất
- 📚 **Tài liệu tốt hơn**: Hướng dẫn toàn diện và ví dụ
- 🚀 **Hỗ trợ nhanh**: Phản hồi nhanh hơn cho issues và feature requests
- 🌟 **Phát triển cộng đồng**: Giúp hệ sinh thái n8n ngày càng tốt hơn

**Mọi đóng góp đều giúp dự án này tồn tại và phát triển!** ⭐

### 🎯 Quyên góp nhanh

<img src="https://img.vietqr.io/image/MB-0816226086-compact.jpg" alt="VietQR Donation" width="300" height="300" />

**Quét QR code ở trên để quyên góp ngay qua VietQR**

Sự ủng hộ của bạn, dù nhỏ hay lớn, đều tạo ra sự khác biệt thực sự! Cảm ơn bạn đã là một phần của cộng đồng. 🙏

---

*"Những công cụ tuyệt vời được xây dựng bởi các nhà phát triển đam mê được hỗ trợ bởi những người dùng tuyệt vời như bạn!"*

## 📄 Giấy phép

Dự án này được cấp phép theo MIT License.