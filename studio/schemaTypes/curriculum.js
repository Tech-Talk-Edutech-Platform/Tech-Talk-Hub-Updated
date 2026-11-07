export default {
  name: 'curriculum',
  title: 'Curriculum',
  type: 'document',
  fields: [
    {name: 'title', title: 'Title', type: 'string'},
    {
      name: 'difficultyLevel',
      title: 'Difficulty Level',
      type: 'string',
      options: {list: ['Beginner', 'Intermediate', 'Advanced']},
    },
    {name: 'duration', title: 'Estimated Duration', type: 'string'},
    {name: 'levelImage', title: 'Level Icon', type: 'image', options: {hotspot: true}},
    {name: 'description', title: 'Description', type: 'text'},
    {name: 'skills', title: 'Skills', type: 'array', of: [{type: 'string'}]},
    {
      name: 'activityCount',
      title: 'Number of Activities',
      type: 'number',
      description: 'Total number of hands-on activities (e.g., 15)',
    },
    {name: 'orderRank', title: 'Order Rank', type: 'number'},
  ],
}
// // schemas/curriculum.js
// export default {
//   name: 'curriculum',
//   title: 'Curriculum',
//   type: 'document',
//   fields: [
//     {
//       name: 'title',
//       title: 'Title',
//       type: 'string',
//       description: 'e.g., Junior Explorers'
//     },
//     {
//       name: 'difficultyLevel',
//       title: 'Difficulty Level',
//       type: 'string',
//       options: {
//         list: [
//           { title: 'Beginner', value: 'Beginner' },
//           { title: 'Intermediate', value: 'Intermediate' },
//           { title: 'Advanced', value: 'Advanced' }
//         ]
//       },
//       description: 'The proficiency level for this track.'
//     },
//     {
//       name: 'duration',
//       title: 'Estimated Duration',
//       type: 'string',
//       description: 'e.g., 2–4 Months'
//     },
//     {
//       name: 'description',
//       title: 'Description',
//       type: 'text',
//       description: 'A short summary of the level.'
//     },
//     {
//       name: 'skills',
//       title: 'Skills',
//       type: 'array',
//       of: [{ type: 'string' }],
//       description: 'List of skills like Scratch, Logic, Robotics.'
//     },
//     {
//       name: 'projectOutcome',
//       title: 'Project Outcome',
//       type: 'string',
//       description: 'e.g., Build your first game.'
//     },
//     {
//       name: 'levelImage',
//       title: 'Level Icon/Image',
//       type: 'image',
//       options: { hotspot: true },
//       description: 'An icon or illustration for this curriculum level.'
//     },
//     {
//       name: 'orderRank',
//       title: 'Order Rank',
//       type: 'number',
//       description: 'Used to control the display order (1, 2, 3...)'
//     }
//   ]
// }
// // // schemas/curriculum.js
// // export default {
// //   name: 'curriculum',
// //   title: 'Curriculum',
// //   type: 'document',
// //   fields: [
// //     {
// //       name: 'title',
// //       title: 'Title',
// //       type: 'string',
// //       description: 'e.g., Junior Explorers'
// //     },
// //     {
// //       name: 'ageRange',
// //       title: 'Age Range',
// //       type: 'string',
// //       description: 'e.g., Ages 5–9'
// //     },
// //     {
// //       name: 'description',
// //       title: 'Description',
// //       type: 'text',
// //       description: 'A short summary of the level.'
// //     },
// //     {
// //       name: 'skills',
// //       title: 'Skills',
// //       type: 'array',
// //       of: [{ type: 'string' }],
// //       description: 'List of skills like Scratch, Logic, Robotics.'
// //     },
// //     {
// //       name: 'projectOutcome',
// //       title: 'Project Outcome',
// //       type: 'string',
// //       description: 'e.g., Build your first game.'
// //     },
// //     {
// //       name: 'orderRank',
// //       title: 'Order Rank',
// //       type: 'number',
// //       description: 'Used to control the display order (1, 2, 3...)'
// //     }
// //   ]
// // }
