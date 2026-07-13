// Exact simulation of the protect middleware behavior
const testProtect = async (req, res, next) => {
  try {
    let token;

```
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      console.log('inside if - should not reach here');
      token = req.headers.authorization.split(" ")[1];
    }

    console.log('after if block, before closing brace');
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
```

  } catch (error) {
    console.error("AUTH ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Token is invalid or expired",
    });
  }
};

// Test the middleware
const mockRes = () => {
  const obj = { status: (...args) => { console.log('res.status called'); return { json: (...args2) => { console.log('res.json called'); return 'response'; } }; }};
  return obj;
};

console.log('Before calling testProtect');
const result = testProtect({headers: {}}, mockRes(), () => { console.log('next() called'); });
console.log('After calling testProtect, result:', result);
result.then(r => console.log('Promise resolved with:', r)).catch(e => console.log('Promise rejected:', e.message));