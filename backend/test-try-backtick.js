// Test what happens in the actual try-catch structure
const testMiddleware = async () => {
  try {
    let token;

```
    if (token) {
      console.log('has token');
    }
```

  } catch (error) {
    console.error("AUTH ERROR:", error);
  }
};

testMiddleware();