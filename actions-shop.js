/* actions-shop.js — Handlers: search, product options, cart, reviews, placing orders. */

// Header search box -> shop page.
Actions.search = e => {
  e.preventDefault();
  navigate('/shop?q=' + encodeURIComponent($('#q').value));
};

// Change the sort order on the shop page.
Actions.sortBy = v => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  q.set('sort', v);
  navigate('/shop?' + q);
};

// Gallery thumbnail click.
Actions.selectImage = i => {
  ui.img = i;
  route();
};

// Colour swatch click.
Actions.selectColor = c => {
  ui.color = c;
  route();
};

// Size button click.
Actions.selectSize = s => {
  ui.size = s;
  route();
};

// +/- on the product page quantity.
Actions.stepQuantity = d => {
  const v = $('#qv');
  v.textContent = Math.max(1, +v.textContent + d);
};

// Add to cart. Stops if the size is missing or the quantity exceeds stock.
Actions.addToCart = (id, buy) => {
  const p = findProduct(id), qty = +$('#qv').textContent;
  if (!ui.size)
    return toast('Please choose a size');
  const ex = db.cart.find(c => c.pid == id && c.size == ui.size && c.color == ui.color), have = db.cart.filter(c => c.pid == id).reduce((s, c) => s + c.qty, 0);
  if (have + qty > p.stock)
    return toast(`Only ${ p.stock } in stock`);
  ex ? ex.qty += qty : db.cart.push({
    pid: id,
    size: ui.size,
    color: ui.color,
    qty
  });
  save();
  updateHeader();
  buy ? navigate('/cart') : toast('Added to cart');
};

// +/- in the cart; never exceeds stock.
Actions.changeCartQty = (i, d) => {
  const c = db.cart[i], p = findProduct(c.pid);
  if (c.qty + d < 1)
    return;
  if (db.cart.filter(x => x.pid == c.pid).reduce((s, x) => s + x.qty, 0) + d > p.stock)
    return toast(`Only ${ p.stock } in stock`);
  c.qty += d;
  save();
  route();
};

// Change size or colour of a cart line.
Actions.updateCartItem = (i, k, v) => {
  db.cart[i][k] = v;
  save();
  route();
};

// Remove a cart line.
Actions.removeFromCart = i => {
  db.cart.splice(i, 1);
  save();
  updateHeader();
  route();
};

// Add a review and recalculate the rating.
Actions.postReview = (e, id) => {
  e.preventDefault();
  const p = findProduct(id), f = e.target;
  p.reviews.push({
    u: currentUser().name,
    r: +f.r.value,
    t: f.t.value
  });
  p.rating = +(p.reviews.reduce((s, r) => s + r.r, 0) / p.reviews.length).toFixed(1);
  save();
  route();
  toast('Review posted');
};

// Fill checkout fields from a saved address.
Actions.fillAddress = i => {
  if (i === '')
    return;
  const a = currentUser().addrs[i], f = $('#co');
  f.address.value = a.address;
  f.city.value = a.city;
  f.zip.value = a.zip;
};

// Checkout: validate the form and stock, create the order, deduct stock.
Actions.placeOrder = e => {
  e.preventDefault();
  const f = e.target, v = n => f[n].value.trim(), er = m => ($('#err').textContent = m, 0), L = cartLines(), t = totals(), pay = f.pay.value;
  if (v('name').length < 2)
    return er('Enter your full name.');
  if (!/^\S+@\S+\.\S+$/.test(v('email')))
    return er('Enter a valid email.');
  if (!/^(09|\+639)\d{9}$/.test(v('phone').replace(/\s/g, '')))
    return er('Enter a valid PH mobile number (09XXXXXXXXX).');
  if (v('address').length < 5 || !v('city') || !/^\d{4}$/.test(v('zip')))
    return er('Complete the address (4-digit postal code).');
  if (pay.startsWith('Credit') && (!/^\d{16}$/.test(v('cn').replace(/\s/g, '')) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(v('ex')) || !/^\d{3,4}$/.test(v('cv'))))
    return er('Check your card number, expiry (MM/YY) and CVV.');
  for (const c of L) {
    const n = L.filter(x => x.pid == c.pid).reduce((s, x) => s + x.qty, 0);
    if (!c.size)
      return er(`Choose a size for ${ c.p.name } in your cart.`);
    if (n > c.p.stock)
      return er(`${ c.p.name } has only ${ c.p.stock } left.`);
  }
  const o = {
    id: 'SW' + Date.now().toString().slice(-7),
    uid: currentUser().id,
    name: v('name'),
    email: v('email'),
    phone: v('phone'),
    addr: `${ v('address') }, ${ v('city') } ${ v('zip') }`,
    pay: pay.startsWith('Credit') ? 'Card \u2022\u2022\u2022\u2022' + v('cn').replace(/\s/g, '').slice(-4) : pay,
    items: L.map(c => ({
      pid: c.pid,
      name: c.p.name,
      cats: c.p.cats,
      size: c.size,
      color: c.color,
      qty: c.qty,
      price: finalPrice(c.p)
    })),
    total: t.total,
    status: 'Pending',
    date: new Date().toLocaleDateString()
  };
  L.forEach(c => c.p.stock -= c.qty);
  db.orders.push(o);
  db.cart = [];
  save();
  updateHeader();
  navigate('/done/' + o.id);
};
