import mongoose from 'mongoose';
const { Schema } = mongoose;

const mongooseOpts = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

await mongoose.connect('mongodb://localhost/final-project', mongooseOpts)
	.then(() => console.log('connected to database'))
	.catch((err) => console.error(err));

// scheduled times will likely be replaced with a schema of its own
// professors will likely be replaced with a schema of its own

const courseSchema = new Schema({
	courseNumber: String,
	courseName: String,
	scheduledTimes: String,
	professors: String,
});

mongoose.model('Course', courseSchema);
export default courseSchema;