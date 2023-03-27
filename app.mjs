import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import './models/course.mjs';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Course = mongoose.model('Course');

const testSet = [];
for(let i = 0; i < 20; i++) testSet.push({ courseName: 'a', courseNumber: `XXXX ${i}`, scheduledTimes: 'Mon 0930-1045, Wed 0930-1045', professors: [{ name: `px-${i}`, rating: Math.round(Math.random() * 5 * 10) / 10 }] });

app.set('view engine', 'hbs');
app.listen(process.env.PORT || 3000);

app.use(express.urlencoded({ extended:false }));

app.get('/', (req, res) => {
	res.redirect('/courses');
});

app.get('/courses', async (req, res) => {
	const courses = await Course.find();
	res.render('course-list', { courses });
});

app.get('/courses/add', (req, res) => {
	res.render('add-course');
});

// TODO
app.post('/courses/add', async (req, res) => {
	try{
		const scheduledTimes = req.body.scheduledTimes.split(', ').map(time => {
			const [day, times] = time.split(' ');
			const [start, end] = times.split('-');
			return { day, start, end };
		});

		const professors = req.body.professors.split(', ').map(prof => {
			const profData = prof.split(' ');
			const formattedProf = {};

			switch(profData.length) {
			case 1:
				formattedProf.last = profData[0];
				break;
			case 2:
				if(profData[1].indexOf('(') === -1){
					formattedProf.first = profData[0];
					formattedProf.last = profData[1];
				} else{
					formattedProf.last = profData[0];
					formattedProf.rating = +profData[1].substring(1, profData[1].indexOf(')'));
				}
				break;
			case 3:
				formattedProf.first = profData[0];
				formattedProf.last = profData[1];
				formattedProf.rating = +profData[2].substring(1, profData[2].indexOf(')'));
				break;
			}

			return formattedProf;
		});

		const newCourseData = {
			courseNumber: req.body.courseNumber,
			courseName: req.body.courseName,
			credits: +req.body.credits,
			scheduledTimes,
			professors,
		};

		const newCourse = new Course(newCourseData);
		await newCourse.save();
		res.redirect('/courses');
	}catch(err){
		res.status(400).send('Invalid Input! Field missing or format was bad!');
	}

});

app.post('/courses/remove', async (req, res) => {
	const [courseNumber, courseName] = req.body.courseToRemove.split(': ');
	await Course.deleteOne({ courseNumber, courseName });
	res.redirect('/courses');
});