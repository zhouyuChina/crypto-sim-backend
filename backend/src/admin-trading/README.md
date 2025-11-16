# Admin Trading Monitor - WebSocket Interface

This module provides real-time trading monitoring for admin users via WebSocket.

## WebSocket Namespace

```
/admin/trading
```

## Connection

Connect to the WebSocket using Socket.IO client:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/admin/trading', {
  auth: {
    token: 'your-jwt-token' // Admin JWT token
  }
});
```

## Events

### Client → Server

#### 1. Subscribe to Trading Updates

Subscribe to receive real-time trading updates.

```javascript
socket.emit('trading:subscribe', {
  adminId: 'admin-user-id'
}, (response) => {
  console.log('Subscribed:', response);
  // Response: { success: true, count: 10 }
});
```

**Initial Data Event**: After subscribing, you'll receive the current active transactions:

```javascript
socket.on('trading:initial-data', (data) => {
  console.log('Initial transactions:', data.transactions);
  console.log('Timestamp:', data.timestamp);
});
```

#### 2. Unsubscribe

```javascript
socket.emit('trading:unsubscribe', {}, (response) => {
  console.log('Unsubscribed:', response);
});
```

#### 3. Edit Transaction

Edit a transaction's details.

```javascript
socket.emit('trading:edit', {
  transactionId: 'transaction-id',
  adminId: 'admin-user-id',
  updates: {
    investAmount: '1000.50',
    returnRate: '0.85'
    // Add other fields you want to update
  }
}, (response) => {
  if (response.success) {
    console.log('Transaction updated:', response.transaction);
  }
});
```

#### 4. Cancel Transaction

Cancel a pending transaction.

```javascript
socket.emit('trading:cancel', {
  transactionId: 'transaction-id',
  adminId: 'admin-user-id',
  reason: 'User request' // Optional
}, (response) => {
  if (response.success) {
    console.log('Transaction cancelled:', response.transaction);
  }
});
```

#### 5. Force Settle Transaction

Force settlement of a transaction with optional custom price.

```javascript
socket.emit('trading:force-settle', {
  transactionId: 'transaction-id',
  adminId: 'admin-user-id',
  settlementPrice: 50000.00 // Optional custom settlement price
}, (response) => {
  if (response.success) {
    console.log('Transaction force-settled:', response.transaction);
  }
});
```

### Server → Client

#### 1. Transaction Updated

Emitted when a transaction is updated (edited, cancelled, or force-settled).

```javascript
socket.on('trading:transaction-updated', (data) => {
  console.log('Transaction updated:', data.transaction);
  console.log('Action:', data.action); // 'edited', 'cancelled', 'force-settled'
  console.log('Timestamp:', data.timestamp);
});
```

#### 2. New Transaction

Emitted when a new transaction is created.

```javascript
socket.on('trading:new-transaction', (data) => {
  console.log('New transaction:', data.transaction);
  console.log('Timestamp:', data.timestamp);
});
```

#### 3. Status Changed

Emitted when a transaction's status changes.

```javascript
socket.on('trading:status-changed', (data) => {
  console.log('Transaction:', data.transaction);
  console.log('Old status:', data.oldStatus);
  console.log('New status:', data.newStatus);
  console.log('Timestamp:', data.timestamp);
});
```

#### 4. Error

Emitted when an error occurs.

```javascript
socket.on('trading:error', (error) => {
  console.error('Error:', error.message);
});
```

## Transaction Data Structure

```typescript
{
  id: string;
  userId: string;
  userName: string | null;
  orderNumber: string;
  assetType: string;
  direction: 'LONG' | 'SHORT';
  entryTime: Date;
  expiryTime: Date;
  duration: number;
  entryPrice: string; // Decimal
  currentPrice: string | null; // Decimal
  exitPrice: string | null; // Decimal
  spread: string; // Decimal
  investAmount: string; // Decimal
  returnRate: string; // Decimal
  actualReturn: string; // Decimal
  status: 'PENDING' | 'SETTLED' | 'CANCELED';
  manualAdjusted: boolean;
  manualAdjustedById: string | null;
  manualAdjustedByName: string | null;
  manualAdjustmentReason: string | null;
  manualAdjustedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  settledAt: Date | null;
  accountType: 'DEMO' | 'REAL';
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
}
```

## Example: React Component

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

function AdminTradingMonitor() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/admin/trading', {
      auth: {
        token: localStorage.getItem('admin_token')
      }
    });

    setSocket(newSocket);

    // Subscribe to trading updates
    newSocket.emit('trading:subscribe', {
      adminId: 'admin-123'
    });

    // Listen for initial data
    newSocket.on('trading:initial-data', (data) => {
      setTransactions(data.transactions);
    });

    // Listen for new transactions
    newSocket.on('trading:new-transaction', (data) => {
      setTransactions(prev => [data.transaction, ...prev]);
    });

    // Listen for transaction updates
    newSocket.on('trading:transaction-updated', (data) => {
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === data.transaction.id ? data.transaction : tx
        )
      );
    });

    // Listen for status changes
    newSocket.on('trading:status-changed', (data) => {
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === data.transaction.id ? data.transaction : tx
        )
      );
    });

    // Cleanup on unmount
    return () => {
      newSocket.emit('trading:unsubscribe');
      newSocket.disconnect();
    };
  }, []);

  const handleCancel = (transactionId: string) => {
    if (socket) {
      socket.emit('trading:cancel', {
        transactionId,
        adminId: 'admin-123',
        reason: 'Admin cancelled'
      }, (response) => {
        if (!response.success) {
          console.error('Failed to cancel:', response.error);
        }
      });
    }
  };

  return (
    <div>
      <h1>Active Transactions ({transactions.length})</h1>
      <table>
        <thead>
          <tr>
            <th>Order Number</th>
            <th>User</th>
            <th>Asset</th>
            <th>Direction</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id}>
              <td>{tx.orderNumber}</td>
              <td>{tx.user.displayName || tx.user.email}</td>
              <td>{tx.assetType}</td>
              <td>{tx.direction}</td>
              <td>{tx.investAmount}</td>
              <td>{tx.status}</td>
              <td>
                <button onClick={() => handleCancel(tx.id)}>
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTradingMonitor;
```

## Security Notes

- This WebSocket namespace should only be accessible to admin users
- Always validate the JWT token on connection
- Implement proper role-based access control
- Consider adding admin ID verification for sensitive operations

## Performance Considerations

- The initial data load is limited to 100 most recent active transactions
- Only `PENDING` status transactions are monitored in real-time
- Consider implementing pagination for large datasets
- Use debouncing for frequent updates if needed
