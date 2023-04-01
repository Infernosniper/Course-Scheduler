// Helper functions for generating schedules and the visualization of them.

// Splits 'HHMM' into [Hour, Min];
const splitTime = (time) => [+time.substring(0, 2), +time.substring(2, 4)];

// Converts Sun-Sat to 0-6
const convertDayToIndex = (day) => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days.indexOf(day);
};

// Dynamically creates time table with course data based on earliest start time and latest end time of courses
const makeTimeTable = (courses) => {
	const timeTable = [];

	// determines earliest and latest course hour for table range
	const [earliest, latest] = courses.reduce((acc, curCourse) => {
		const [courseEarliest, courseLatest] = curCourse.scheduledTimes.reduce((innerAcc, time) => {
			if(splitTime(time.start)[0] < innerAcc[0]) innerAcc[0] = splitTime(time.start)[0];
			if(splitTime(time.end)[0] > innerAcc[1]) innerAcc[1] = splitTime(time.end)[0];
			return innerAcc;
		}, [23, 0]);
		if(courseEarliest < acc[0]) acc[0] = courseEarliest;
		if(courseLatest > acc[1]) acc[1] = courseLatest;
		return acc;
	}, [23, 0]);

	// creates table of 5 minute intervals in above range
	for(let hour = earliest; hour <= latest; hour++){
		for(let min = 0; min < 60; min += 5){
			timeTable.push({
				timeStr: `${('0' + hour).slice(-2)}:${('0' + min).slice(-2)}`,
				newRow: min === 0 || min === 30,
				coursesAtTime: Array.from({ length: 7 }, Object),
			});
		}
	}

	// for each course time, add it to the correct time slot in the time table
	for (const course of courses){
		for(const time of course.scheduledTimes){
			const [startHour, startMin] = splitTime(time.start);
			const [endHour, endMin] = splitTime(time.end);
			const numBlocks = (((endHour - startHour) * 60) + ((endMin - startMin))) / 5;

			const reformattedCourse = {
				numBlocks,
				courseNumber: course.courseNumber,
				courseName: course.courseName,
				professors: course.professors,
				color: course.color,
			};

			const startIndex = timeTable.findIndex((t) => t.timeStr.split(':').join('') === time.start);
			timeTable[startIndex].coursesAtTime[convertDayToIndex(time.day)] = reformattedCourse;
			for(let i = 1; i < numBlocks; i++) timeTable[startIndex + i].coursesAtTime[convertDayToIndex(time.day)].spannedOver = true;
		}
	}

	return timeTable;
};

// checks if time overlap between any courses in a potential schedule
const isOverlap = (schedule) => {
	for(const courseA of schedule){
		for(const courseB of schedule){
			if(courseA._id.valueOf() !== courseB._id.valueOf()){
				for(const timeA of courseA.scheduledTimes){
					for(const timeB of courseB.scheduledTimes){
						if(timeA.day === timeB.day && timeA.start <= timeB.end && timeB.start <= timeA.end) return true;
					}
				}
			}
		}
	}

	return false;
};

const recMakeNonconflictingSchedules = (unusedCourses, schedule = []) => {
	schedule = schedule.sort((a, b) => a._id.valueOf().localeCompare(b._id.valueOf()));
	const validSchedules = [];

	// validates current schedule
	if(schedule.length > 0){
		if(isOverlap(schedule)) return [];
		else validSchedules.push(schedule);
	}

	// generates possible next schedules
	for(let i = 0; i < unusedCourses.length; i++){
		const nestedValidSchedules = recMakeNonconflictingSchedules([...unusedCourses.slice(0, i), ...unusedCourses.slice(i + 1)], [unusedCourses[i], ...schedule]);
		if(nestedValidSchedules.length > 0) validSchedules.push(...nestedValidSchedules);
	}

	return validSchedules;
};

const makeNonconflictingSchedules = (courses, method, params) => {
	let potentialSchedules = recMakeNonconflictingSchedules(courses);

	// removes duplicates
	const stringified = potentialSchedules.map(JSON.stringify);
	const uniqueStringArray = new Set(stringified);
	potentialSchedules = Array.from(uniqueStringArray, JSON.parse);

	// removes schedules outside of desired params (either via num credits or num courses)
	if(method === 'credits'){
		const [minCredits, maxCredits] = params;
		return potentialSchedules.filter((schedule) => {
			const numCredits = schedule.reduce((acc, course) => {
				acc += course.credits;
				return acc;
			}, 0);

			return numCredits >= minCredits && numCredits <= maxCredits;
		});
	}else if(method === 'courses'){
		const numCourses = params[0];
		return potentialSchedules.filter((schedule) => schedule.length === numCourses);
	}
};

export {
	makeTimeTable,
	makeNonconflictingSchedules,
};