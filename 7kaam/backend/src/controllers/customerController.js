const prisma = require('../utils/prisma');

// PATCH /api/v1/customers/:id — a customer updating their own profile only.
async function updateCustomer(req, res) {
  try {
    if (req.auth.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const allowed = ['fullName', 'city'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

    const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
    res.json(customer);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Customer not found' });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { updateCustomer };
