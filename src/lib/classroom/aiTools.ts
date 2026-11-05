// "AI teaching tools". Today these are local templates built from the class
// data, so the feature works offline. To use a real model, replace `generate`
// with a call to your backend; the modal only needs { title, body } back.
import type {
  Activity,
  AiTool,
  AiToolId,
  AiToolResult,
  Student,
} from '../../types/classroom'

export const AI_TOOLS: AiTool[] = [
  {
    id: 'icebreaker',
    title: 'Icebreaker',
    description: 'A fun icebreaker for your student',
    icon: 'smile',
  },
  {
    id: 'explain',
    title: 'Explain concepts',
    description: 'Simple ways to explain lesson concepts',
    icon: 'book',
  },
  {
    id: 'encourage',
    title: 'Encourage student',
    description: 'A motivating message for your student',
    icon: 'heart',
  },
  {
    id: 'hint',
    title: 'Activity hint',
    description: 'A guided hint for the current activity',
    icon: 'compass',
  },
]

type ToolContext = { student: Student; activity: Activity }

const interestLine = (student: Student) =>
  student.interests.length ? student.interests.join(' and ') : 'coding'

const TEMPLATES: Record<AiToolId, (context: ToolContext) => AiToolResult> = {
  icebreaker: ({ student }) => ({
    title: `Icebreaker for ${student.name}`,
    body: [
      `“If you could build a robot to do one chore for you, what would it do, and what would you name it?”`,
      `Follow up: “What would it need to sense to know when to start?” That leads straight into inputs and sensors.`,
      `Since ${student.name} is into ${interestLine(student)}, ask which game or app they wish existed, and keep it for the guided build.`,
    ],
  }),
  explain: ({ activity }) => ({
    title: `Explaining ${activity.title}`,
    body: [
      `Start from the goal: ${activity.outline}`,
      'Variables are labelled boxes: the box keeps its name, and you can swap what is inside.',
      'A function is a recipe card: write the steps once, then “cook” it whenever you call its name.',
      'Loops are a playlist on repeat; conditions are a bouncer who checks each guest before letting them in.',
    ],
  }),
  encourage: ({ student }) => ({
    title: `A note for ${student.name}`,
    body: [
      `${student.name}, you debugged that like a real developer: you read the error, made a guess and tested it. That is the whole job.`,
      'Every coder you admire got stuck on exactly this kind of bug. Keep going, you are closer than you think.',
    ],
  }),
  hint: ({ activity }) => ({
    title: `Hint: ${activity.title}`,
    body: [
      'Ask: “What should happen first when the program starts?” Let them say it out loud before typing.',
      'If they are stuck, point to the one block or line that controls that first step, and let them change it.',
      `Open the project together: ${activity.project}`,
    ],
  }),
}

export function generate(toolId: AiToolId, context: ToolContext) {
  return TEMPLATES[toolId](context)
}
