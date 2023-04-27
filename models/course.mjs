import fs from 'fs';
import path from 'path';
import url from 'url';
import mongoose from 'mongoose';
import slug from 'mongoose-slug-updater';
import passportLocalMongoose from 'passport-local-mongoose';

const { Schema } = mongoose;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const mongooseOpts = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

// is the environment variable, NODE_ENV, set to PRODUCTION?
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
	// if we're in PRODUCTION mode, then read the configration from a file
	// use blocking file io to do this...
	const fn = path.join(__dirname, '..', 'config.json');
	const data = fs.readFileSync(fn);

	// our configuration file will be in json, so parse it and set the
	// conenction string appropriately!
	const conf = JSON.parse(data);
	dbconf = conf.dbconf;
} else {
	// if we're not in PRODUCTION mode, then use
	dbconf = 'mongodb://localhost/final-project';
}

await mongoose.connect(dbconf, mongooseOpts)
	.then(() => console.log('connected to database'))
	.catch((err) => console.error(err));

mongoose.plugin(slug);

// scheduledTime contains the day of week, start time, and end time
const scheduledTimeSchema = new Schema({
	day: { type: String, enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
	start: { type: String, required: true, minLength: 4, maxLength: 4 },
	end: { type: String, required: true, minLength: 4, maxLength: 4 },
});

// professor contains first optional first name, last name, optional RMP rating
const professorsSchema = new Schema({
	first: String,
	last: { type: String, required: true },
	rating: { type: Number, min: 0, max: 5 },
});

// course contains course number, course name, number of credits, scheduled times, professors, and color for displaying
const courseSchema = new Schema({
	courseNumber: { type: String, required: true },
	courseName: { type: String, required: true },
	credits: {
		type: Number,
		min: 0,
		validate : {
			validator: Number.isInteger,
			message: '${VALUE} is not an integer value',
		},
		required: true,
	},
	scheduledTimes: { type: [scheduledTimeSchema], required: true },
	professors: { type: [professorsSchema], required: true },
	mandatory: { type: Boolean, required: true },
	color: { type: String, required: true },
	slug: {
		type: String,
		slug: ['courseNumber', 'courseName'],
		unique: true,
		slugPaddingSize: 4,
	},
});

// Schema for User

const userSchema = new Schema({
	username: { type: String, required: true },
	hash: { type: String, required: true },
	courses: { type: [String] },
});

userSchema.plugin(passportLocalMongoose);

mongoose.model('Course', courseSchema);
mongoose.model('User', userSchema);