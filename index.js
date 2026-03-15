require('dotenv').config();
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;
const stripe = require('stripe')(process.env.STRIPE_SECRET);

stripe.products.create({
    name: 'Starter Subscription',
    description: '$12/Month subscription',
}).then(product => {
    stripe.prices.create({
        unit_amount: 1200,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id,
    });
});

const app = express();
app.use(cors());
app.use(express.json());

const admin = require('firebase-admin');
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// ── Firebase token middleware ──────────────────────────────────────────────
const verifyFBToken = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send({ message: 'Unauthorized access' });
    try {
        const idToken = token.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.decoded_email = decodedToken.email;
        next();
    } catch {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
};

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI || "mongodb+srv://missionscic11:DwoVlYyNFx3zUviq@cluster0.nsup1w5.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        const db                  = client.db('missionscic11DB');
        const userCollections     = db.collection('user');
        const requestsCollections = db.collection('request');
        const paymentCollections  = db.collection('payments');
        const contactCollections  = db.collection('contacts');
        const blogCollections     = db.collection('blogs');

        // ── Users ────────────────────────────────────────────────────────────
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const exists = await userCollections.findOne({ email: userInfo.email });
            if (exists) return res.send({ message: 'User already exists', insertedId: null });
            userInfo.createdAt = new Date();
            userInfo.role = 'donor';
            userInfo.status = 'active';
            const result = await userCollections.insertOne(userInfo);
            res.send(result);
        });

        app.get('/users', verifyFBToken, async (req, res) => {
            const result = await userCollections.find().toArray();
            res.status(200).send(result);
        });

        app.get('/users/role/:email', async (req, res) => {
            const result = await userCollections.findOne({ email: req.params.email });
            res.send(result);
        });

        app.patch('/users/update/:email', async (req, res) => {
            const { name, mainPhotoUrl, district, upazila } = req.body;
            const result = await userCollections.updateOne(
                { email: req.params.email },
                { $set: { name, mainPhotoUrl, district, upazila } }
            );
            res.send(result);
        });

        app.patch('/update/user/status', verifyFBToken, async (req, res) => {
            const { email, status } = req.query;
            const result = await userCollections.updateOne({ email }, { $set: { status } });
            res.send(result);
        });

        // ── Stats ─────────────────────────────────────────────────────────────
        app.get('/total-donors', async (req, res) => {
            const count = await userCollections.countDocuments({ role: 'donor' });
            res.send({ totalDonors: count });
        });

        app.get('/total-requests', async (req, res) => {
            const count = await requestsCollections.countDocuments();
            res.send({ totalRequests: count });
        });

        // ── Blood Requests ────────────────────────────────────────────────────
        app.post('/requests', verifyFBToken, async (req, res) => {
            const data = req.body;
            data.createdAt = new Date();
            data.donation_status = 'pending';
            const result = await requestsCollections.insertOne(data);
            res.send(result);
        });

        app.get('/all-requests', async (req, res) => {
            const result = await requestsCollections.find().sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.get('/my-request', verifyFBToken, async (req, res) => {
            const email = req.decoded_email;
            const size  = Number(req.query.size) || 10;
            const page  = Number(req.query.page) || 0;
            const query = { requester_email: email };
            const result = await requestsCollections.find(query)
                .sort({ createdAt: -1 }).limit(size).skip(size * page).toArray();
            const totalRequest = await requestsCollections.countDocuments(query);
            res.send({ request: result, totalRequest });
        });

        app.get('/search-requests', async (req, res) => {
            const { bloodGroup, district, upazila } = req.query;
            const query = {};
            if (bloodGroup) query.blood_group = bloodGroup.replace(/ /g, '+').trim();
            if (district)   query.recipient_district = district;
            if (upazila)    query.recipient_upazila  = upazila;
            const result = await requestsCollections.find(query).toArray();
            res.send(result);
        });

        app.patch('/requests/:id/status', verifyFBToken, async (req, res) => {
            const { donation_status } = req.body;
            const valid = ['pending', 'inprogress', 'done', 'cancelled'];
            if (!valid.includes(donation_status))
                return res.status(400).send({ message: 'Invalid status' });
            const result = await requestsCollections.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { donation_status } }
            );
            res.send(result);
        });

        app.delete('/requests/:id', verifyFBToken, async (req, res) => {
            const result = await requestsCollections.deleteOne(
                { _id: new ObjectId(req.params.id) }
            );
            res.send(result);
        });

        // ── Blogs ─────────────────────────────────────────────────────────────
        app.get('/blogs', async (req, res) => {
            const result = await blogCollections.find().sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.get('/blogs/:id', async (req, res) => {
            const result = await blogCollections.findOne({ _id: new ObjectId(req.params.id) });
            if (!result) return res.status(404).send({ message: 'Blog not found' });
            res.send(result);
        });

        app.post('/blogs', verifyFBToken, async (req, res) => {
            const blog = req.body;
            blog.createdAt = new Date();
            blog.authorEmail = req.decoded_email;
            const result = await blogCollections.insertOne(blog);
            res.send(result);
        });

        app.patch('/blogs/:id', verifyFBToken, async (req, res) => {
            const { title, category, excerpt, content, image, tags } = req.body;
            const result = await blogCollections.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { title, category, excerpt, content, image, tags, updatedAt: new Date() } }
            );
            res.send(result);
        });

        app.delete('/blogs/:id', verifyFBToken, async (req, res) => {
            const result = await blogCollections.deleteOne(
                { _id: new ObjectId(req.params.id) }
            );
            res.send(result);
        });

        // ── Contact ───────────────────────────────────────────────────────────
        app.post('/contact', async (req, res) => {
            const { name, email, subject, message } = req.body;
            if (!name || !email || !subject || !message)
                return res.status(400).send({ message: 'All fields are required.' });
            const result = await contactCollections.insertOne({
                name, email, subject, message, submittedAt: new Date()
            });
            res.status(201).send({ success: true, insertedId: result.insertedId });
        });

        app.get('/contact', verifyFBToken, async (req, res) => {
            const result = await contactCollections.find().sort({ submittedAt: -1 }).toArray();
            res.send(result);
        });

        // ── Payments ──────────────────────────────────────────────────────────
        app.post('/create-payment-checkout', async (req, res) => {
            const information = req.body;
            const amount = parseInt(information.donateAmount) * 100;
            const session = await stripe.checkout.sessions.create({
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        unit_amount: amount,
                        product_data: { name: 'Blood Donation — BloodLink' }
                    },
                    quantity: 1
                }],
                mode: 'payment',
                metadata: { donorName: information?.donorName },
                customer_email: information.donorEmail,
                success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url:  `${process.env.SITE_DOMAIN}/payment-cancelled`,
            });
            res.send({ url: session.url });
        });

        app.post('/success-payment', async (req, res) => {
            const { session_id } = req.query;
            const session = await stripe.checkout.sessions.retrieve(session_id);
            const transactionId = session.payment_intent;
            const isPaymentExist = await paymentCollections.findOne({ transactionId });
            if (isPaymentExist) return res.status(400).send('Already exists');
            if (session.payment_status === 'paid') {
                const result = await paymentCollections.insertOne({
                    amount:         session.amount_total / 100,
                    currency:       session.currency,
                    donorEmail:     session.customer_email,
                    transactionId,
                    payment_status: session.payment_status,
                    paidAt:         new Date(),
                });
                return res.send(result);
            }
            res.status(400).send({ message: 'Payment not completed' });
        });

        console.log('BloodLink API connected to MongoDB');
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>BloodLink API</title>
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩸</text></svg>" />
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', sans-serif; background:#0f0f0f; color:#f5f5f5; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
        .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:20px; padding:48px 40px; max-width:520px; width:100%; text-align:center; }
        .badge { display:inline-flex; align-items:center; gap:8px; background:rgba(192,7,7,0.15); border:1px solid rgba(192,7,7,0.3); color:#ff4444; border-radius:99px; padding:6px 16px; font-size:12px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:28px; }
        .dot { width:8px; height:8px; border-radius:50%; background:#22c55e; animation:pulse 1.5s infinite; flex-shrink:0; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        h1 { font-size:32px; font-weight:800; margin-bottom:8px; }
        h1 span { color:#C00707; }
        p { color:#888; font-size:14px; line-height:1.7; margin-bottom:28px; }
        .routes { background:#111; border:1px solid #222; border-radius:12px; padding:20px; text-align:left; margin-bottom:28px; }
        .routes h3 { font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; }
        .route { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid #1e1e1e; font-size:12px; }
        .route:last-child { border-bottom:none; }
        .method { font-weight:700; min-width:46px; font-size:11px; }
        .get  { color:#22c55e; }
        .post { color:#3b82f6; }
        .patch{ color:#f59e0b; }
        .del  { color:#ef4444; }
        .path { color:#ccc; font-family:monospace; }
        .links { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        a { padding:10px 22px; border-radius:10px; font-size:13px; font-weight:700; text-decoration:none; transition:opacity 0.15s; }
        .primary { background:#C00707; color:#fff; }
        .secondary { background:#1e1e1e; border:1px solid #333; color:#aaa; }
        a:hover { opacity:0.82; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> API Online</div>
        <h1>🩸 Blood<span>Link</span> API</h1>
        <p>Production REST API for the BloodLink blood donation platform. Serving donors and recipients across all 64 districts of Bangladesh.</p>
        <div class="routes">
          <h3>Key Endpoints</h3>
          <div class="route"><span class="method get">GET</span><span class="path">/all-requests</span></div>
          <div class="route"><span class="method post">POST</span><span class="path">/requests</span></div>
          <div class="route"><span class="method get">GET</span><span class="path">/search-requests</span></div>
          <div class="route"><span class="method get">GET</span><span class="path">/blogs</span></div>
          <div class="route"><span class="method post">POST</span><span class="path">/contact</span></div>
          <div class="route"><span class="method get">GET</span><span class="path">/users</span></div>
          <div class="route"><span class="method patch">PATCH</span><span class="path">/requests/:id/status</span></div>
          <div class="route"><span class="method del">DELETE</span><span class="path">/requests/:id</span></div>
        </div>
        <div class="links">
          <a class="primary" href="https://assignment-11-abusayemsifat.pages.dev" target="_blank">Live Site</a>
          <a class="secondary" href="https://github.com/abusayemsifat/Assignment-11-frontend.git" target="_blank">GitHub Repo</a>
        </div>
      </div>
    </body>
    </html>
  `);
});
app.listen(port, () => console.log(`BloodLink server running on port ${port}`));