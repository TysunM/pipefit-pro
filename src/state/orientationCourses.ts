// The built-in modules, as courses
// --------------------------------
// The nine modules that ship in the app, already written up as the course
// Claude would make of them: sections to read or hear, and the check. Written
// here so the orientation works on a phone with no signal, on day one, with
// nothing set up. Each follows its module's text in state/orientation.ts
// word for word in what it holds; the Spanish versions are built by Claude
// from the same text and kept on the phone once built.

import type { Course } from './orientation';

const q = (qq: string, choices: string[], answer: number, why: string) => ({ q: qq, choices, answer, why });
const s = (heading: string, ...points: string[]) => ({ heading, points });

export const BUILTIN_COURSES: Readonly<Record<string, Course>> = {
  'b:welcome': {
    title: 'Your first day on site',
    sections: [
      s('The site comes first', 'Every site has its own rules, and they come first.', 'What is taught here is general practice across the trade.', 'Where your site says something different, your site is right.'),
      s('You can stop the work', 'If you see something unsafe, you stop the work. Nobody can hold it against you.', 'You do not need to be sure.', 'A near miss is reported the same day, the same as an injury, because the next one hits somebody.'),
      s('Through the gate', 'Sign in or badge in every time you come in, so the site knows who is inside in an emergency.', 'Know where the muster point is and which way the wind blows: a gas release means walking upwind to it.', 'Know the site alarm tones. The orientation tells you which means what.'),
      s('Ask', 'A journeyman would rather answer a question than fill in an incident report.', 'Your foreman is the first person you ask; the safety officer is the second.', 'Nobody on a good site thinks less of a man who asks.'),
      s('Fit for duty', 'Phones stay off the work floor unless the site allows them for work.', 'No alcohol, no drugs; some prescriptions need telling the foreman.', 'Fit for duty means rested, sober and able to do the task.'),
    ],
    questions: [
      q('Your site rule and this course disagree. Which wins?', ['This course', 'Your site rule', 'Whichever is stricter, as you judge it', 'Ask a journeyman to decide'], 1, 'Every site has its own rules, and they come first.'),
      q('You see something that looks unsafe but you are not sure. What do you do?', ['Keep working and watch it', 'Stop the work', 'Wait until the foreman comes by', 'Finish your task first, then report it'], 1, 'You have stop-work authority, and you do not need to be sure.'),
      q('A near miss happened, nobody was hurt. When is it reported?', ['Never, nobody was hurt', 'At the end of the week', 'The same day, like an injury', 'Only if it happens again'], 2, 'A near miss is reported the same day, because the next one hits somebody.'),
      q('There is a gas release alarm. Which way do you walk?', ['Downwind, away from the unit', 'Upwind, to the muster point', 'To the gate', 'To your truck'], 1, 'A gas release means walking upwind to the muster point and counting heads.'),
      q('Who do you ask first when you do not know?', ['The safety officer', 'Your foreman', 'Another new hire', 'Nobody; figure it out'], 1, 'Your foreman is the first person you ask; the safety officer is the second.'),
    ],
  },
  'b:ppe': {
    title: 'Personal protective equipment',
    sections: [
      s('The basics, everywhere', 'Hard hat, safety glasses with side shields, safety-toe boots with a heel, high-visibility vest or shirt, long trousers.', 'Shorts, tennis shoes and sleeveless shirts do not come on site.'),
      s('Gloves for the task', 'Cut-resistant for steel and sheet metal, leather for rigging, chemical gloves when the SDS says so.', 'Take gloves off around rotating equipment: a drill or a threading machine can wind a glove in, and the hand with it.'),
      s('Face and ears', 'A face shield goes over the glasses for grinding, chipping, cutting with a wheel and pouring chemicals.', 'Hearing protection is worn where posted, and wherever you must raise your voice to be heard at arm\'s length.', 'Eight hours at 85 decibels is the level the law acts on; a grinder is louder.'),
      s('Flame-resistant clothing', 'Worn where the site requires it: live electrical work, process units with flammable product, hot work.', 'Synthetic clothing melts to skin in a flash fire; FR clothing does not.'),
      s('Inspect before use', 'A cracked hard hat, scratched lenses, a frayed harness strap or a cut glove is replaced, not used.', 'A hard hat that has taken a hit is replaced even if it looks fine.'),
    ],
    questions: [
      q('You are about to use a pipe threading machine. Your gloves?', ['Leather gloves on', 'Cut-resistant gloves on', 'Gloves off', 'Whatever you were wearing'], 2, 'Rotating equipment can wind a glove in and the hand with it; gloves come off.'),
      q('Grinding a weld. What goes on your face?', ['Safety glasses only', 'A face shield over the safety glasses', 'A face shield instead of glasses', 'A dust mask'], 1, 'A face shield goes over the safety glasses for grinding; glasses alone are not enough against a bursting wheel.'),
      q('When is hearing protection required, beyond where it is posted?', ['Only around cranes', 'When you have to raise your voice to be heard at arm\'s length', 'Never, unless posted', 'Only on night shift'], 1, 'Anywhere you have to raise your voice to be heard at arm\'s length.'),
      q('Your hard hat took a knock from a dropped fitting and looks fine.', ['Keep wearing it', 'Replace it', 'Wear it until the end of the job', 'Turn it round'], 1, 'A hard hat that has taken a hit is replaced even if it looks fine.'),
      q('Why FR clothing around flammable product?', ['It is warmer', 'It looks professional', 'Synthetic clothing melts to skin in a flash fire', 'It is cheaper'], 2, 'Synthetic clothing melts to skin in a flash fire; FR clothing does not.'),
    ],
  },
  'b:fall': {
    title: 'Working at height',
    sections: [
      s('Six feet', 'On a construction site, fall protection is required at six feet or more above a lower level.', 'That means guardrails, a net, or a harness with a lanyard and an anchor.', 'Some sites require it lower; the site rules say.'),
      s('Tied off the whole time', 'One hundred percent tie-off: connected the whole time you are at height, including while you move.', 'A double lanyard lets you connect the second hook before you release the first.', 'An anchor holds 5,000 pounds per person, or is designed and marked by a competent person. A handrail or a small pipe is not an anchor.'),
      s('Your harness', 'Inspect webbing, stitching, D-ring, buckles and hooks before each use.', 'A harness that has arrested a fall is taken out of service.'),
      s('Ladders', 'Three points of contact, face the ladder, never the top two rungs.', 'One foot out for every four feet up, the top secured and three feet above the landing.', 'Tools go in a belt or get hoisted, not carried in your hand.'),
      s('Scaffolds and holes', 'Green tag: complete and inspected. Yellow: a hazard, harness required. Red: do not use.', 'Never change a scaffold yourself.', 'Holes are covered, secured and marked HOLE; nothing is dropped from height.'),
    ],
    questions: [
      q('On a construction site, fall protection is required from what height?', ['Four feet', 'Six feet', 'Ten feet', 'Twelve feet'], 1, 'Fall protection is required at six feet or more above a lower level.'),
      q('Which of these is an anchor point?', ['A handrail', 'A cable tray', 'A point marked by a competent person', 'A two-inch conduit'], 2, 'An anchor must hold 5,000 pounds per person or be designed and marked by a competent person.'),
      q('A scaffold carries a yellow tag.', ['Do not use it', 'Use it; it is complete', 'Use it with a harness; a hazard is present', 'Fix the hazard yourself first'], 2, 'Yellow means a hazard is present and a harness is required.'),
      q('How is an extension ladder set?', ['One foot out for every two up', 'One foot out for every four up', 'As steep as possible', 'Flat against the wall'], 1, 'One foot out for every four feet up, the top secured and three feet above the landing.'),
      q('Your harness arrested a fall yesterday. Today?', ['Use it after a look-over', 'Take it out of service', 'Use it for ladders only', 'Wash it and use it'], 1, 'A harness that has arrested a fall is taken out of service.'),
    ],
  },
  'b:loto': {
    title: 'Lockout, tagout and stored energy',
    sections: [
      s('Isolated and locked', 'Before work on anything that could start, move, energise, pressurise or release, it is isolated and locked.', 'Breakers opened and locked; valves closed, locked and tagged; lines blinded where the site requires.'),
      s('Your lock, your key', 'You put your own lock on every isolation point for your job, and only you take it off.', 'Never remove another person\'s lock. A lock left behind goes through the site\'s procedure with a supervisor, never bolt cutters.'),
      s('Try it before you trust it', 'After the lock goes on, test that the energy is gone: push the start, test for voltage, open a vent.', 'A lock proves nothing until you have tried the start.'),
      s('Stored energy', 'A locked-out line can still hold pressure, hot product or a vacuum.', 'Springs, counterweights, capacitors, a raised load and an accumulator hold energy with everything switched off.', 'Bleed, vent, drain and block before you break a flange, and crack the far-side bolts first so it opens away from you.'),
      s('Tags and putting it back', 'A tag alone is not a lock; it is used only where a lock cannot fit, with extra protection.', 'The people who put locks on take them off, and the area is checked clear before re-energising.'),
    ],
    questions: [
      q('A lock is on. Whose is it to remove?', ['The foreman\'s', 'Anyone finishing the job', 'Only the person who put it on', 'The electrician\'s'], 2, 'Your own lock, your own key: only you take it off, and nobody removes another person\'s lock.'),
      q('The lock is on. What comes next, before you work?', ['Start work', 'Try the start to prove the energy is gone', 'Sign the permit', 'Remove the tag'], 1, 'A lock proves nothing until you have tried the start.'),
      q('A line is locked out and isolated. Can it still hurt you?', ['No, it is locked', 'Yes: pressure, hot product or a vacuum can still be in it', 'Only if the power is on', 'Only on steam lines'], 1, 'A locked-out line can still hold pressure, hot product or a vacuum: bleed, vent, drain and block first.'),
      q('Breaking a flange on a line that may hold pressure, which bolts do you loosen first?', ['The ones nearest you', 'The far-side bolts, so it opens away from you', 'All at once', 'The top ones'], 1, 'Crack the bolts on the far side first so the flange opens away from you.'),
      q('When is a tag alone enough?', ['Always, if it is signed', 'Only where a lock cannot be fitted, with extra protection', 'For short jobs', 'Never'], 1, 'A tag alone is not a lock; it is used only where a lock cannot be fitted, and then with extra protection.'),
    ],
  },
  'b:hotwork': {
    title: 'Hot work and fire',
    sections: [
      s('What hot work is', 'Anything that makes a flame, a spark or enough heat to light something: welding, cutting, grinding, torching, soldering.', 'On most sites it needs a permit for a time and a place, with the atmosphere tested where there may be vapour.'),
      s('Clear the area', 'Combustibles moved at least thirty-five feet away or covered with fire blankets.', 'Floor openings and drains within that distance covered. Sparks travel further than you think and roll downhill.'),
      s('Fire watch', 'Stays through the work and at least thirty minutes after the last spark, longer where the site requires.', 'Extinguisher in hand, no other job. The fire watch is not the welder.', 'Check the extinguisher first: pin in, gauge in the green, the right class.'),
      s('Cylinders', 'Upright and chained, caps on when not connected.', 'Oxygen and fuel gas twenty feet apart or behind a fire-rated barrier.', 'Hoses, regulators and flashback arrestors checked before lighting; lit with a striker, never a lighter.'),
      s('Everyone else', 'Welding screens protect other people\'s eyes. Never look at an arc without a shield.', 'Never weld near a solvent, a degreaser or an open container of product.'),
    ],
    questions: [
      q('How far are combustibles moved from hot work?', ['Ten feet', 'Twenty feet', 'Thirty-five feet, or covered with fire blankets', 'Fifty feet'], 2, 'Combustibles are moved at least thirty-five feet away or covered with fire blankets.'),
      q('How long does the fire watch stay after the last spark?', ['Until the welder packs up', 'At least thirty minutes, longer where the site requires', 'Five minutes', 'Until lunch'], 1, 'A fire watch stays through the work and for at least thirty minutes after the last spark.'),
      q('Can the welder be the fire watch?', ['Yes, if experienced', 'No: the fire watch has no other job', 'Yes, on small jobs', 'Only with a permit'], 1, 'The fire watch has no other job, and the fire watch is not the welder.'),
      q('How are oxygen and fuel gas stored?', ['Together, chained', 'Twenty feet apart or behind a fire-rated barrier', 'Lying down', 'In the truck'], 1, 'Oxygen and fuel gas are stored twenty feet apart or behind a fire-rated barrier.'),
      q('What lights the torch?', ['A lighter', 'A match', 'A striker', 'The arc'], 2, 'The torch is lit with a striker, never a lighter.'),
    ],
  },
  'b:confined': {
    title: 'Confined spaces and excavations',
    sections: [
      s('What a confined space is', 'Big enough to enter, not meant to be occupied, limited ways in and out: a tank, a vessel, a pit, a large pipe, a vault, a trench.', 'A permit-required space also holds a hazard: a dangerous atmosphere, engulfment, sloping walls, or anything else that can hurt you inside.'),
      s('Before anyone enters', 'A permit, an attendant at the opening, a tested atmosphere and a way out.', 'Oxygen 19.5 to 23.5 percent, flammable gas under ten percent of its lower explosive limit, toxic gases under their limits.', 'Nitrogen has no smell and kills in two breaths. A purged vessel is a vessel to test.'),
      s('The attendant', 'Stays outside, keeps count, keeps contact and calls for help.', 'The attendant never goes in. Most of the dead in confined spaces went in to rescue the first one.', 'Rescue is the trained team with the equipment, named on the permit before anyone enters.'),
      s('Excavations', 'Five feet deep or more needs a protective system: sloping, benching, shoring or a trench box, unless in stable rock.', 'Four feet or deeper needs a ladder or ramp within twenty-five feet of every worker.', 'Spoil and equipment stay two feet back from the edge. A competent person inspects before every shift and after rain.'),
      s('Never', 'Never work under a suspended load or a bucket.', 'Never enter a trench that has not been inspected.'),
    ],
    questions: [
      q('The oxygen reading at the opening is 18 percent. Do you enter?', ['Yes, it is close enough', 'No: oxygen must be between 19.5 and 23.5 percent', 'Yes, with a dust mask', 'Yes, for a quick look'], 1, 'Oxygen must be between 19.5 and 23.5 percent before entry.'),
      q('Your partner collapses inside a vessel. What do you do?', ['Go in and pull them out', 'Stay out, keep contact and call the trained rescue team', 'Go in with a rope', 'Wait and watch'], 1, 'The attendant never goes in; rescue is done by the trained team with the equipment.'),
      q('A trench is six feet deep in ordinary soil. What does it need?', ['Nothing special', 'A protective system: sloping, benching, shoring or a box', 'A ladder only', 'A rope'], 1, 'A trench five feet deep or more needs a protective system unless it is in stable rock.'),
      q('How far does spoil stay from the edge of a trench?', ['One foot', 'Two feet', 'Six inches', 'It can sit on the edge'], 1, 'Spoil piles and equipment stay two feet back from the edge.'),
      q('A vessel was purged with nitrogen and opened an hour ago.', ['It is safe; nitrogen is harmless', 'Test it before anyone enters', 'Sniff at the opening', 'Enter with the hatch open'], 1, 'Nitrogen has no smell and kills in two breaths; a purged vessel is a vessel to test.'),
    ],
  },
  'b:hazcom': {
    title: 'Chemicals, dust and the SDS',
    sections: [
      s('Labels and the SDS', 'Every chemical has a label with pictograms and a safety data sheet of sixteen sections.', 'In the field the sections that matter are the hazards, the PPE, the first aid and the spill response.', 'Read the SDS before you use something for the first time, and know where the sheets are kept.'),
      s('Handling', 'Never mix chemicals, never put one in an unlabelled container, never use a food container.', 'Keep the lid on. Wash before you eat, drink or smoke.'),
      s('Eyewash', 'Know where the nearest eyewash and safety shower are, and how to get there with your eyes closed.', 'Fifteen minutes of flushing for a splash in the eyes; somebody else calls for help while you flush.'),
      s('Silica and old material', 'Cutting, grinding or drilling concrete, block, stone and some refractory makes dust that scars the lungs for life.', 'Wet methods, a vacuum shroud or a fit-tested respirator; a paper dust mask is not a respirator.', 'Old insulation, gaskets, floor tile and paint can hold asbestos or lead. Not sure? Stop and ask. Do not disturb it.'),
      s('Gases', 'Hydrogen sulphide, carbon monoxide, chlorine, ammonia and nitrogen are the gases that kill on process sites.', 'Where they are present you wear a personal monitor, know the alarm levels, and walk upwind and uphill when it goes off.'),
    ],
    questions: [
      q('How long do you flush a chemical splash in the eyes?', ['Thirty seconds', 'Two minutes', 'Fifteen minutes', 'Until it stops stinging'], 2, 'Fifteen minutes of flushing is the rule for a splash in the eyes.'),
      q('You need to grind a concrete pad. What protects your lungs?', ['A paper dust mask', 'Wet methods, a vacuum shroud or a fit-tested respirator', 'Holding your breath', 'Working fast'], 1, 'A paper dust mask is not a respirator; wet methods, a shroud or a fit-tested respirator are required.'),
      q('You find old pipe insulation you cannot identify.', ['Pull it off and keep going', 'Stop and ask; do not disturb it', 'Wet it down and remove it', 'Bag it yourself'], 1, 'If you find material you are not sure of, stop and ask. Do not disturb it.'),
      q('Your gas monitor alarms. Which way?', ['Downwind and downhill', 'Upwind and uphill', 'Toward the unit to find the leak', 'Stay put'], 1, 'Walk upwind and uphill when the monitor goes off.'),
      q('A chemical in an unlabelled bottle.', ['Use it if you know what it is', 'Never: nothing goes in an unlabelled container', 'Smell it to check', 'Label it later'], 1, 'Never put a chemical into an unlabelled container, and never use one.'),
    ],
  },
  'b:hands': {
    title: 'Hands, tools, lifting and rigging',
    sections: [
      s('Pinch points', 'Before you move something, look for where it could pinch, crush or trap.', 'Fingers stay out of a bolt hole; use a drift pin to line up a flange.'),
      s('The right tool, the right way', 'A wrench is pulled, not pushed, so your knuckles do not go into the steel when it slips.', 'A cheater bar on a wrench is a broken wrench waiting to happen.', 'A screwdriver is not a chisel; a wrench is not a hammer.'),
      s('Inspect tools', 'Mushroomed chisels, cracked handles, frayed cords, missing guards and dead ground pins take the tool out of service.', 'Grinder guards stay on; the wheel\'s speed rating is at or above the grinder\'s.', 'Power runs through a GFCI; a damaged cord is replaced, not taped.'),
      s('Lifting', 'Bend your knees, keep the load close, do not twist.', 'Get help or a machine for anything heavy or awkward. Fifty pounds is a common limit for one person; a length of six-inch pipe is more.'),
      s('Rigging', 'Only trained riggers rig; only the designated signal person signals the crane.', 'Nobody walks or stands under a suspended load, ever. Tag lines control the load; hands do not.', 'Inspect slings and shackles before each lift, and know the load\'s weight before it leaves the ground.'),
    ],
    questions: [
      q('Lining up bolt holes on a flange. What goes in the hole?', ['A finger', 'A drift pin', 'A bolt, by feel', 'A screwdriver'], 1, 'Keep your fingers out of a bolt hole; use a drift pin to line up a flange.'),
      q('A wrench is...', ['Pushed', 'Pulled', 'Hit with a hammer', 'Used with a cheater bar'], 1, 'A wrench is pulled, not pushed, so your knuckles do not go into the steel when it slips.'),
      q('A power cord has a cut in the jacket.', ['Tape it', 'Replace it', 'Use it dry', 'Use it if the GFCI trips'], 1, 'A damaged cord is not taped; it is replaced.'),
      q('A load is suspended from the crane. Where do you stand?', ['Under it, to guide it', 'Never under it', 'Under it if it is light', 'On it'], 1, 'Nobody walks or stands under a suspended load, ever.'),
      q('Who signals the crane?', ['Anyone who sees a problem', 'The designated signal person', 'The rigger and the fitter together', 'The foreman by radio'], 1, 'Only the designated signal person signals the crane.'),
    ],
  },
  'b:heat': {
    title: 'Heat, cold, weather and fatigue',
    sections: [
      s('Heat', 'Drink water every fifteen to twenty minutes, thirsty or not, a cup at a time. Rest in shade on the schedule the site sets.', 'Watch your partner: confusion, headache, nausea, dizziness, cramps or hot dry skin mean shade, cooling and a report now.', 'The first week in heat is the dangerous one: shorter spells and more breaks until your body catches up. Energy drinks do not count as water.'),
      s('Cold', 'Layers, dry gloves, dry socks, a warm place to break.', 'Shivering, clumsiness and slurred words are the signs.', 'Freezing steel takes skin off; wear gloves to touch it.'),
      s('Lightning and wind', 'When thunder is heard, work at height and outdoor work stop and everyone goes to shelter.', 'Thirty minutes after the last thunder, work starts again. Scaffolds, cranes and steel are not shelter.', 'High wind stops lifts and work at height.'),
      s('Fatigue', 'A man on his fourteenth hour makes the mistakes a rested man does not.', 'If you are too tired to work safely, say so; it is the same as stopping unsafe work.'),
    ],
    questions: [
      q('How often do you drink water in the heat?', ['When thirsty', 'Every fifteen to twenty minutes', 'At breaks only', 'Once an hour'], 1, 'Drink water every fifteen to twenty minutes whether or not you are thirsty.'),
      q('Your partner is confused and has stopped sweating.', ['Tell him to drink up and keep going', 'Shade, cooling and a report now', 'Send him to the truck', 'Wait for lunch'], 1, 'Confusion and hot dry skin are the signs; a man showing them is taken into shade, cooled and reported now.'),
      q('When does work restart after thunder?', ['When the rain stops', 'Thirty minutes after the last thunder', 'Ten minutes after', 'When the foreman says'], 1, 'Thirty minutes after the last thunder, work starts again.'),
      q('Is a scaffold shelter from lightning?', ['Yes, if it is grounded', 'No', 'Yes, under the deck', 'Only steel ones'], 1, 'Scaffolds, cranes and steel are not shelter.'),
      q('You are too tired to work safely.', ['Push through', 'Say so; it is the same as stopping unsafe work', 'Have an energy drink', 'Work slower and say nothing'], 1, 'If you are too tired to work safely, say so.'),
    ],
  },
};
