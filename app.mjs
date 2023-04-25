import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import passport from 'passport';
import connectEnsureLogin from 'connect-ensure-login';
import './models/course.mjs';
import { makeTimeTable, makeNonconflictingSchedules } from './courseConstruction.mjs';

// Default values based on a typical NYU student
const NUM_COURSES = 4, MIN_CREDITS = 16, MAX_CREDITS = 18;

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Course = mongoose.model('Course');
const User = mongoose.model('User');

app.set('view engine', 'hbs');
app.listen(process.env.PORT ?? 3000);

app.use(express.urlencoded({ extended:false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
	secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
	resave: false,
	saveUninitialized: true,
	// 1 day
	cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
	res.redirect('/courses');
});

app.get('/login', (req, res) => {
	const context = {};
	if(req.session.messages !== undefined){
		context.loginMessage = req.session.messages[0];
		delete req.session.context;
	}

	if(req.session.badRegistration !== undefined){
		context.registrationMessage = req.session.badRegistration;
		delete req.session.badRegistration;
	}
	res.render('login', context);
});

app.get('/courses', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
	const courses = await Course.find();
	res.render('course-list', { username: req.user.username, courses, defaults: { NUM_COURSES, MIN_CREDITS, MAX_CREDITS } });
});

app.get('/courses/add', connectEnsureLogin.ensureLoggedIn(), (req, res) => {
	res.render('add-course', { username: req.user.username});
});

app.get('/courses/schedules/:method', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
	const queryData = [];

	if(req.params.method === 'credits') queryData.push(+req.query.minCredits || MIN_CREDITS, +req.query.maxCredits || MAX_CREDITS);
	else if(req.params.method === 'courses') queryData.push(+req.query.numCourses || NUM_COURSES);

	const rawSchedules = makeNonconflictingSchedules(await Course.find(), req.params.method, queryData);
	const timeTables = rawSchedules.map((schedule => {
		const tableData = {
			numCredits: schedule.reduce((acc, course) => {
				acc += course.credits;
				return acc;
			}, 0),
			numCourses: schedule.length,
			data: makeTimeTable(schedule),
		};
		return tableData;
	}));

	let titleMessage;
	if(timeTables.length === 0) titleMessage = 'No valid schedules with ';
	else titleMessage = 'Filtered by schedules with ';
	titleMessage += `${req.params.method === 'credits' ? `${req.query.minCredits || MIN_CREDITS}-${req.query.maxCredits || MAX_CREDITS} credits` : `${req.query.numCourses || NUM_COURSES} courses`}!`;

	res.render('schedules', { username: req.user.username, numSchedules: timeTables.length > 0 ? timeTables.length : undefined, titleMessage, timeTables });
});

app.get('/courses/edit', connectEnsureLogin.ensureLoggedIn(), (req, res) => {
	res.send("TO BE IMPLEMENTED");
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }), (req, res) => {
	if(req.session.returnTo !== undefined) res.redirect(req.session.returnTo);
	else res.redirect('/');
});

app.post('/register', (req, res) => {
	User.register({ username: req.body.username }, req.body.password, async function(err){
		if(err){
			req.session.badRegistration = err.message;
			res.redirect('/login');
		}else {
			const newUser = await User.findOne({ username: req.body.username });
			req.login(newUser, () => {
				if(req.session.returnTo !== undefined) res.redirect(req.session.returnTo);
				else res.redirect('/');
			});
		}
	});
});

app.post('/logout', connectEnsureLogin.ensureLoggedIn(), (req, res) => {
	req.logout(() => {
		res.redirect('/');
	});
});

app.post('/courses/add', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
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
			mandatory: req.body.mandatory === 'on' ? true : false,
			color: (req.body.color === '#000000') ? `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, 0).toUpperCase()}` : req.body.color,
		};

		const newCourse = new Course(newCourseData);
		await newCourse.save();

		res.redirect('/courses');
	}catch(err){
		res.status(400).send('Invalid Input! Field missing or format was bad!');
	}
});

app.post('/courses/remove', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
	if(req.body.courseToRemove !== '') await Course.deleteOne({ _id: req.body.courseToRemove });

	res.redirect('/courses');
});