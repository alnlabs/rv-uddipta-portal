/** Seed owners list — 58 flats, floor-wise (floors 1–14 × 4, floor 15 × 2). */

const FIRST_NAMES = [
  'Srinivas', 'Lakshmi', 'Ramesh', 'Anitha', 'Venkat', 'Padma', 'Krishna', 'Sita',
  'Rajesh', 'Meena', 'Suresh', 'Kavitha', 'Naresh', 'Deepa', 'Prasad', 'Sunitha',
  'Mahesh', 'Rekha', 'Gopal', 'Swapna', 'Harish', 'Jyothi', 'Ashok', 'Bhavani',
  'Kiran', 'Shalini', 'Mohan', 'Priya', 'Vijay', 'Anjali', 'Naveen', 'Sandhya',
  'Ravi', 'Geetha', 'Sandeep', 'Manjula', 'Praveen', 'Asha', 'Karthik', 'Divya',
  'Arun', 'Nirmala', 'Chaitanya', 'Sravani', 'Teja', 'Madhavi', 'Rohit', 'Pooja',
  'Abhilash', 'Harini', 'Sai', 'Varsha', 'Nikhil', 'Lavanya', 'Phani', 'Keerthi',
  'Yashwanth', 'Bindu',
];

const LAST_NAMES = [
  'Reddy', 'Rao', 'Sharma', 'Nair', 'Iyer', 'Patel', 'Gupta', 'Singh',
  'Chowdary', 'Naidu', 'Verma', 'Joshi', 'Pillai', 'Das', 'Kumar', 'Murthy',
  'Acharya', 'Bhat', 'Shetty', 'Menon',
];

const TYPES = ['2BHK', '2BHK', '3BHK', '3BHK'];

function phoneFor(index) {
  const base = 9000000000 + index * 1117 + 42;
  return String(base).slice(0, 10);
}

function buildFlats() {
  const flats = [];
  let index = 0;

  for (let floor = 1; floor <= 14; floor += 1) {
    for (let unit = 1; unit <= 4; unit += 1) {
      flats.push(makeFlat(floor, unit, index));
      index += 1;
    }
  }

  for (let unit = 1; unit <= 2; unit += 1) {
    flats.push(makeFlat(15, unit, index));
    index += 1;
  }

  return flats;
}

function makeFlat(floor, unit, index) {
  const flatNumber = `${floor}${String(unit).padStart(2, '0')}`;
  const ownerName = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`;
  const phone = phoneFor(index);
  const type = TYPES[unit - 1] || '2BHK';

  // Spread realistic possession progress across the building
  let registration = 'pending';
  let interior = 'not_started';
  let ceremony = 'pending';
  let moving = 'pending';

  if (index % 7 === 0) {
    registration = 'completed';
    interior = 'in_progress';
  } else if (index % 5 === 0) {
    registration = 'completed';
    interior = 'completed';
    ceremony = 'completed';
  } else if (index % 3 === 0) {
    registration = 'completed';
    interior = 'in_progress';
    ceremony = 'pending';
  } else if (index % 11 === 0) {
    registration = 'completed';
    interior = 'completed';
    ceremony = 'completed';
    moving = 'moved_in';
  }

  return {
    flatNumber,
    floor,
    unit,
    type,
    ownerName,
    phone,
    registration,
    interior,
    ceremony,
    moving,
  };
}

module.exports = { buildFlats };
