// Helper functions for generating schedules and the visualization of them.

// Splits 'HHMM' into [Hour, Min];
const splitTime = (time) => [+time.substring(0, 2), +time.substring(2, 4)];

//
const convertDayToIndex = (day) => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days.indexOf(day);
};

// Dynamically creates time table with course data based on earliest start time and latest end time of courses
const makeTimeTable = (courses) => {
	const timeTable = [];

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

	for(let hour = earliest; hour <= latest; hour++){
		for(let min = 0; min < 60; min += 5){
			timeTable.push({
				timeStr: `${('0' + hour).slice(-2)}:${('0' + min).slice(-2)}`,
				newRow: min === 0 || min === 30,
				coursesAtTime: Array.from({ length: 7 }, Object),
			});
		}
	}

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

const isOverlap = (courseA, schedule) => {
	for(const courseB of schedule){
		for(let i = 0; i < courseA.scheduledTimes.length; i++){
			if(courseB.scheduledTimes[i] === undefined) break;

			const [dayA, dayB] = [courseA.scheduledTimes[i].day, courseB.scheduledTimes[i].day];
			const [startA, endA] = [+courseA.scheduledTimes[i].start, +courseA.scheduledTimes[i].end];
			const [startB, endB] = [+courseB.scheduledTimes[i].start, +courseB.scheduledTimes[i].end];

			if(dayA !== dayB) continue;
			if(startA <= endB && startB <= endA) return true;
		}
	}

	return false;
};

const recMakeNonconflictingSchedules = (unusedCourses, schedule = []) => {
	schedule = schedule.sort((a, b) => a._id.valueOf().localeCompare(b._id.valueOf()));
	if(unusedCourses.length === 0) return [];
	const validSchedules = [];

	if(schedule.length > 0){
		const [newCourse, ...existingSchedule] = [schedule[0], ...schedule.slice(1)];
		if(isOverlap(newCourse, existingSchedule)) return [];
		else validSchedules.push(schedule);
	}

	for(let i = 0; i < unusedCourses.length; i++){
		const nestedValidSchedules = recMakeNonconflictingSchedules([...unusedCourses.slice(0, i), ...unusedCourses.slice(i + 1)], [unusedCourses[i], ...schedule]);
		if(nestedValidSchedules.length > 0) validSchedules.push(...nestedValidSchedules);
	}

	return validSchedules;
};

const makeNonconflictingSchedules = (courses, minCredits = 12, maxCredits = 18) => {
	let potentialSchedules = recMakeNonconflictingSchedules(courses);

	// removes duplicates
	const stringified = potentialSchedules.map(JSON.stringify);
	const uniqueStringArray = new Set(stringified);
	potentialSchedules = Array.from(uniqueStringArray, JSON.parse);

	// removes schedules outside of desired credits range
	return potentialSchedules.filter((schedule) => {
		const numCredits = schedule.reduce((acc, course) => {
			acc += course.credits;
			return acc;
		}, 0);

		return numCredits >= minCredits && numCredits <= maxCredits;
	});
};

export {
	makeTimeTable,
	makeNonconflictingSchedules,
};