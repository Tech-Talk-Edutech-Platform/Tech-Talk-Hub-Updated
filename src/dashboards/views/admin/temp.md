<ReactMarkdown 
  remarkPlugins={[remarkGfm]}
  components={{
    h3: ({node, ...props}) => (
      <h3 className="bg-rose-500 text-white px-4 py-2 rounded-r-full font-black uppercase text-sm inline-block shadow-sm my-4" {...props} />
    ),
    h4: ({node, ...props}) => (
      <h4 className="bg-rose-500 text-white px-4 py-2 rounded-r-full font-black uppercase text-xs inline-block shadow-sm my-3" {...props} />
    )
  }}
>
  {lessonNoteContent}
</ReactMarkdown>


----------------------------
REMEMBER THIS
---------------------
import { Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Inside your component render:
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    blockquote: ({ node, children, ...props }) => {
      // Check if the blockquote starts with "Remember This"
      return (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-emerald-900 dark:text-emerald-300 my-4" {...props}>
          <Lightbulb size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs font-medium w-full">
            <span className="block font-black uppercase tracking-wider mb-1 text-emerald-900 dark:text-emerald-200">Remember This</span>
            {children}
          </div>
        </div>
      );
    }
  }}
>
{lessonNoteContent}
</ReactMarkdown>

Topics 1–6 → Activity 1 → Activity 2 → Activity 3 → Assignment → Quiz → Learning Outcomes → Reflection