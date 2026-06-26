import React, { useState } from 'react';
import '../styles/paymentGateway.css';

const PaymentGateway = ({ amount, onPaymentSuccess, onPaymentFailure, paymentFor, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    upiId: ''
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Simulate success rate of 90%
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        const paymentData = {
          transactionId: `TXN${Date.now()}`,
          amount,
          method: paymentMethod,
          status: 'success',
          timestamp: new Date().toISOString(),
          paymentFor
        };
        onPaymentSuccess(paymentData);
      } else {
        onPaymentFailure({
          error: 'Payment failed. Please try again.',
          code: 'PAYMENT_FAILED'
        });
      }
      
      setIsProcessing(false);
    }, 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="payment-gateway">
      {onBack && (
        <button className="payment-gateway-back" onClick={onBack}>
          Back to Fees
        </button>
      )}
      
      <div className="payment-header">
        <h3>Secure Payment</h3>
        <div className="payment-summary">
          <div className="payment-amount">
            <span>Amount to Pay</span>
            <strong>₹{amount}</strong>
          </div>
          <div className="payment-for">
            <span>Payment For: </span>
            <strong>{paymentFor}</strong>
          </div>
        </div>
      </div>

      {!showPaymentForm ? (
        <div className="payment-methods">
          <h4>Select Payment Method</h4>
          <div className="method-options">
            <label className={`method-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="card" 
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>Debit/Credit Card</span>
            </label>
            <label className={`method-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="upi" 
                checked={paymentMethod === 'upi'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>UPI</span>
            </label>
            <label className={`method-option ${paymentMethod === 'netbanking' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="netbanking" 
                checked={paymentMethod === 'netbanking'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>Net Banking</span>
            </label>
          </div>
          <button 
            className="proceed-btn"
            onClick={() => setShowPaymentForm(true)}
          >
            Proceed to Pay
          </button>
        </div>
      ) : (
        <div className="payment-form">
          {paymentMethod === 'card' && (
            <div className="card-form">
              <h4>Card Details</h4>
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardNumber(paymentDetails.cardNumber)}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'cardNumber',
                      value: e.target.value
                    }
                  })}
                  maxLength={19}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    name="expiryDate"
                    placeholder="MM/YY"
                    value={formatExpiryDate(paymentDetails.expiryDate)}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'expiryDate',
                        value: e.target.value
                      }
                    })}
                    maxLength={5}
                  />
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="password"
                    name="cvv"
                    placeholder="123"
                    value={paymentDetails.cvv}
                    onChange={handleInputChange}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Card Holder Name</label>
                <input
                  type="text"
                  name="cardHolder"
                  placeholder="John Doe"
                  value={paymentDetails.cardHolder}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {paymentMethod === 'upi' && (
            <div className="upi-form">
              <h4>UPI Payment</h4>
              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  name="upiId"
                  placeholder="yourname@paytm"
                  value={paymentDetails.upiId}
                  onChange={handleInputChange}
                />
              </div>
              <div className="upi-apps">
                <h5>Or pay using:</h5>
                <div className="upi-app-buttons">
                  <button className="upi-app">Google Pay</button>
                  <button className="upi-app">PhonePe</button>
                  <button className="upi-app">Paytm</button>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'netbanking' && (
            <div className="netbanking-form">
              <h4>Net Banking</h4>
              <div className="form-group">
                <label>Select Bank</label>
                <select name="bank">
                  <option value="">Select Bank</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                </select>
              </div>
            </div>
          )}

          <div className="payment-gateway-actions">
            <button 
              className="back-btn"
              onClick={() => setShowPaymentForm(false)}
              disabled={isProcessing}
            >
              Back
            </button>
            <button 
              className="pay-btn"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Pay ₹${amount}`
              )}
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-message">
            <div className="spinner-large"></div>
            <p>Processing your payment...</p>
            <p>Please do not close this window</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateway;
