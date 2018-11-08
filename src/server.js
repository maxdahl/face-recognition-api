const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const dbCreds = require('./db')

const db = require('knex')({
	client: 'pg',
	connection: {
		host: dbCreds.host,
		user: dbCreds.user,
		password: dbCreds.password,
		database: dbCreds.database
	}
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
	res.json(db.users);
});

app.post('/signin', (req, res) => {
	user = req.body;

	db('login').select('hash').where('email', '=', user.email)
	.then(data => {
		const isValid = bcrypt.compareSync(user.password, data[0].hash);
		if(isValid) {
			db('users').select('*').where('email', '=', user.email)
			.then(user => {
				res.json(user[0]);
			})
			.catch(err => {
				res.status(400).json('unable to get user');
			});
		}
		else
			throw Error;
	})
	.catch(err => {
		res.status(400).json('wrong credentials');
	});
});

app.post('/register', (req, res) => {
	const user = req.body;
	const pwHash = bcrypt.hashSync(user.password);

	db.transaction(trx => {
		trx('login').insert({
			hash: pwHash,
			email: user.email
		})
		.returning('email')
		.then(email => {
			return trx('users')
			.insert({
				email: email[0],
				name: user.name
			})
			.returning('*')
			.then(user => {
				res.json(user[0]);
			});
		})
		.then(trx.commit)
		.catch(trx.rollback);
	})
	.catch(err => {
		res.status(400).json('unable to register');
	});
});

app.put('/entry/:id', (req, res) => {
	const {id} = req.params;
	db('users')
	.where({id})
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0])
	})
	.catch(err => {
		res.status(400).json('unable to update entries');
	});
});

app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	db('users')
	.select('*')
	.where('id', id)
	.then(user => {
		if(user.length)
			res.json(user[0])
		else
			res.status(404).json('user not found');
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log('app is running on port ' + port);
});