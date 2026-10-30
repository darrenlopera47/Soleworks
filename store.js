/* store.js — Data layer: load/save the database and the cart calculations. All reads/writes of db go through here. */

// The whole "database" is one JSON object saved in localStorage under the key "soleworks".
let db = JSON.parse(localStorage.getItem('soleworks') || 'null');

const save = () => localStorage.setItem('soleworks', JSON.stringify(db));

const currentUser = () => db.users.find(u => u.id === db.session);

const findProduct = id => db.products.find(p => p.id == id);

const finalPrice = p => p.sale || p.price;

const cartLines = () => db.cart.map(c => ({
  ...c,
  p: findProduct(c.pid)
})).filter(c => c.p);

// Cart maths: subtotal, shipping (free from ₱5,000), grand total.
const totals = () => {
  const sub = cartLines().reduce((s, c) => s + finalPrice(c.p) * c.qty, 0), ship = !sub ? 0 : sub >= 5000 ? 0 : 150;
  return {
    sub,
    ship,
    total: sub + ship
  };
};
