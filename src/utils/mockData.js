// src/utils/mockData.js

export const generateMockData = () => {
  const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Lucas", "Mia", "Aiden", "Charlotte", "Logan", "Amelia", "James", "Harper", "Jacob", "Evelyn", "Benjamin"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  
  // Generate 320 Unique Dancers
  const allDancers = [];
  for (let i = 0; i < 320; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    allDancers.push(`${fn} ${ln}`); 
  }

  const styles = ["Ballet", "Jazz", "Tap", "Hip Hop", "Lyrical"];
  const levels = ["Level I", "Level II", "Level III", "Advanced"];

  const createShow = (label, isoDate) => {
    const acts = [];
    for (let i = 1; i <= 35; i++) {
      const style = styles[Math.floor(Math.random() * styles.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      
      const performerCount = Math.floor(Math.random() * 12) + 8;
      const classPerformers = [];
      for (let j = 0; j < performerCount; j++) {
        classPerformers.push(allDancers[Math.floor(Math.random() * allDancers.length)]);
      }

      acts.push({
        number: i,
        title: `${style} ${level} - Act ${i}`,
        performers: [...new Set(classPerformers)]
      });
    }
    return { id: isoDate, label, acts };
  };

  return {
    friday: createShow("Friday Night Showcase", "2026-06-05T19:00:00.000Z"),
    saturday: createShow("Saturday Grand Finale", "2026-06-06T14:00:00.000Z")
  };
};