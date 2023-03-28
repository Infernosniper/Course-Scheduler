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

export {
	makeTimeTable,
};