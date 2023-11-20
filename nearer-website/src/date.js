export function formatTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours > 0 ? hours + ":" : ""}${minutes > 9 ? minutes : "0" + minutes}:${seconds > 9 ? seconds : "0" + seconds}`;
}

function twoDigits(n) {
    const s = `${n}`;
    if (s.length == 1) {
        return "0" + s;
    } else {
        return s;
    }
}

const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function renderMonth(d) {
    return months[d.getMonth()];
}

function convertDate(d) {
    return {
        year: d.getFullYear(),
        //month: d.toLocaleString('default', {month: 'short'}),
        month: renderMonth(d),
        day: d.getDate(),
        hour: ((d.getHours() + 11) % 12) + 1,
        ampm: d.getHours() < 12 ? "am" : "pm",
        minute: d.getMinutes(),
    };
}

export function formatDatetime(date) {
    const now = convertDate(new Date());
    const myDate = convertDate(date);
    function renderTime(d) {
        return `${d.hour}:${twoDigits(d.minute)}`;
    }
    function renderAMPM(d) {
        return `${renderTime(d)} ${d.ampm == "am" ? "AM" : "PM"}`;
    }
    function renderDay(d, prefix) {
        return `${prefix || renderAMPM(d) + ","} ${d.month} ${d.day}`;
    }
    function renderYear(d, prefix) {
        return `${renderDay(d, prefix)}, ${d.year}`;
    }
    //const isMidnight = (myDate.ampm == 'am' && myDate.hour == 12 && myDate.minute == 0)
    const prefix = renderAMPM(myDate) + ",";
    if (now.year != myDate.year) return renderYear(myDate, prefix);
    else if (now.month != myDate.month || now.day != myDate.day)
        return renderDay(myDate, prefix);
    else if (now.ampm != myDate.ampm || myDate.hour == 12)
        return renderAMPM(myDate);
    else return renderTime(myDate);
}
