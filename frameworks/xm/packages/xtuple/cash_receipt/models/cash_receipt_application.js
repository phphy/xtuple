// ==========================================================================
// Project:   xTuple Postbooks - Business Management System Framework        
// Copyright: ©2012 OpenMFG LLC, d/b/a xTuple                             
// ==========================================================================

/*globals XM */

/**
  @class
  
  Used to consolidate receivable and cash receipt detail into a single object.

  @extends SC.Object
*/
XM.CashReceiptApplication = SC.Object.extend(
  /** @scope XM.CashReceiptApplication.prototype */ {
  
  cashReceipt: null,
  
  cashReceiptDetail: null,
  
  receivable: null,

  // .................................................
  // CALCULATED PROPERTIES
  //
  
  /**
    The amount to be applied to the associated receivable.
    
    @type Number
  */
  applied: function() {
    return this.getPath('cashReceiptDetail.amount') || 0;
  }.property('cashReceiptDetail').cacheable(),

  /**
    The discount to be applied to the associated receivable.
    
    @type Number
  */
  discount: function() {
    return this.getPath('cashReceiptDetail.discount') || 0;
  }.property('cashReceiptDetail').cacheable(),
  
  /**
    Total applied amount of this cash receipt in the currency of the receivable.
    
    @type Number
  */
  receivableApplied: function() {
    var applied = this.get('applied'),
        discount = this.get('discount'),
        crCurrencyRate = this.getPath('cashReceipt.currencyRate') || 1,
        arCurrencyRate = this.getPath('receivable.currencyRate');
    return SC.Math.round((applied + discount) * arCurrencyRate / crCurrencyRate, XT.MONEY_SCALE);
  }.property('applied', 'discount').cacheable(),

  /**
    The balance due on the receivable in the receivable's currency.
    
    @type Number
  */  
  balance: function() {
    var receivable = this.get('receivable'),
        balance = receivable.getPath('receivable.balance'),
        pending = receivable.get('pending');
    return SC.Math.round(balance - allPending, XT.MONEY_SCALE);
  }.property('*receivable.pending').cacheable(),
  
  // .................................................
  // METHODS
  //
  
  /**
    Apply an amount from the cash receipt associated with this application
    to the receivable associtated with this application.
    
    @param {Number} amount
    @param {Number} discount
    returns XM.CashReceiptDetail
  */
  apply: function(amount, discount) {
    var cashReceipt = this.get('cashReceipt'),
        isPosted = cashReceipt.get('isPosted'),
        crCurrencyRate = cashReceipt.get('currencyRate'),
        detail = this.get('cashReceiptDetail'),
        receivable = this.get('receivable'),
        arCurrencyRate = receivable.get('currencyRate'),
        documentType = receivable.get('documentType'),
        pending = receivable.get('pending'),
        applied = detail ? detail.get('amount') : 0,
        balance = receivable.get('balance') - pending,
        store = receivable.get('store'),
        pending; 
  
    // values must be valid
    discount = discount || 0;
    if (amount < 0 || discount < 0 || 
        amount + discount - applied > balance ||
        isPosted) return false;
  
    // credits need sense reversed
    if (documentType === XM.Receivable.CREDIT_MEMO || 
        documentType === XM.Receivable.CUSTOMER_DEPOSIT) {
      amount = amount * -1;
      discount = 0; // should never be a discount on credit
    }
  
    // destroy the old detail
    if (detail) { 
      var id = detail.get('id');
      detail.destroy();
      pending = receivable.get('pendingApplications').findProperty('id', id);
      if (pending) pending.destroy();
    };
    
    // create a new detail
    detail = store.createRecord(XM.CashReceiptDetail, {});
    detail.set('receivable', receivable)
          .set('amount', amount)
          .set('discount', discount);
    cashReceipt.get('details').pushObject(detail);
              
    // associate detail to this application
    this.set('cashReceiptDetail', detail);
    
    // fetching the id is asynchronous, so we'll have to finish when that comes
    detail.addObserver('id', detail, function observer() {
      if (!isNaN(detail.get('id'))) {
        detail.removeObserver('id', detail, observer);
        id = detail.get('id');
        
        // create a pending application record (info only, the datasource will ignore this)
        pending = store.createRecord(XM.PendingApplication, { guid: id });
        pending.set('pendingApplicationType', XM.PendingApplication.CASH_RECEIPT)
               .set('receivable', receivable)
               .set('amount', (amount + discount) * arCurrencyRate / crCurrencyRate);
        
        // associate detail to pending applications
        receivable.get('pendingApplications').pushObject(pending);
      }
    })

    // get id
    detail.normalize();

    return detail;
  },
  
  applyBalance: function() {
    var applied = this.get('applied'),
        cashReceipt = this.get('cashReceipt'),
        crCurrencyRate = cashReceipt.get('currencyRate'),
        crBalance = cashReceipt.get('balance'),
        receivable = this.get('receivable'),
        documentType = receivable.get('documentType'),
        arCurrencyRate = receivable.get('currencyRate'),
        arBalance = receivable.get('balance') - receivable.get('pending'),
        documentDate = receivable.get('documentDate'),
        terms = receivable.get('terms'),
        discountDate = terms ? terms.calculateDiscountDate(documentDate) : null,
        discountPercent = terms ? terms.get('discountPercent') / 100 : 0,
        discount = 0, amount;
        
    // determine balance we could apply in cash receipt currency
    amount = SC.Math.round(crBalance + applied, XT.MONEY_SCALE);  
    arBalance = SC.Math.round(arBalance * crCurrencyRate / arCurrencyRate + applied, XT.MONEY_SCALE);
        
    // bail out if nothing to do
    if (arBalance === 0 || amount === 0) return this.get('detail');
    
    // calculate discount if applicable
    if (arBalance > 0 && discountDate && 
        SC.DateTime.compareDate(documentDate, discountDate) <= 0) {
      discount = SC.Math.round(arBalance * discountPercent, XT.MONEY_SCALE);
    }
    
    // adjust the amount or discount as appropriate and apply
    if (documentType === XM.Receivable.INVOICE || 
        documentType === XM.Receivable.DEBIT_MEMO) {
      if (arBalance <= amount + discount) {
        amount = SC.Math.round(arBalance - discount, XT.MONEY_SCALE);
      } else {
        discount = SC.Math.round((amount / (1 - discountPercent)) - amount, XT.MONEY_SCALE);
      }
    } else {
      amount = arBalance;
    }
    if (amount) return this.apply(amount, discount);
    
    // if there was nothing to apply
    return false;
  },
  
  clear: function() {
    var detail = this.get('cashReceiptDetail');
    if (detail) detail.destroy();
    this.set('cashReceiptDetail', null);
  }
  
  // .................................................
  // OBSERVERS
  //
  
});

