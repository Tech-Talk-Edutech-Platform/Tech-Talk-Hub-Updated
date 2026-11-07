export default {
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  fields: [
    {name: 'name', type: 'string', title: 'Name'},
    {name: 'title', type: 'string', title: 'Job Title'},
    {name: 'bio', type: 'text', title: 'Bio'},
    {name: 'image', type: 'image', title: 'Profile Photo', options: {hotspot: true}},
    {name: 'linkedin', type: 'url', title: 'LinkedIn'},
    {name: 'twitter', type: 'url', title: 'Twitter'},
    {name: 'github', type: 'url', title: 'GitHub'},
  ],
}
