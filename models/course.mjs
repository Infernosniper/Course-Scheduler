import mongoose from 'mongoose';
const { Schema } = mongoose;

const mongooseOpts = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

await mongoose.connect('mongodb://localhost/final-project', mongooseOpts)
	.then(() => console.log('connected to database'))
	.catch((err) => console.error(err));

const scheduledTimeSchema = new Schema({
	day: { type: String, enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
	start: { type: String, required: true },
	end: { type: String, required: true },
});

const professorsSchema = new Schema({
	first: String,
	last: { type: String, required: true},
	rating: { type: Number, min: 0, max: 5 },
});

const courseSchema = new Schema({
	courseNumber: { type: String, required: true},
	courseName: { type: String, required: true},
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
});

mongoose.model('Course', courseSchema);

export default courseSchema;