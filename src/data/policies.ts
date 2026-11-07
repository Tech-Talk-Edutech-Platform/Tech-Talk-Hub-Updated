import {
  BookOpen,
  Calendar,
  CreditCard,
  Database,
  Eye,
  FileText,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'

import type { PolicyPageContent } from '../types/policy'
import { EMAIL, PHONE } from './site'

const EMAIL_CONTACT = { label: EMAIL, href: `mailto:${EMAIL}` }

export const PRIVACY_POLICY: PolicyPageContent = {
  badge: 'Privacy & Data Protection',
  title: 'Your privacy',
  highlightedText: 'matters.',
  description:
    'This policy explains how Tech Talk Hub collects, uses and protects information shared by families and website visitors.',
  notice:
    'This policy applies to the Tech Talk Hub website, learning services and communication channels.',
  noticeTone: 'neutral',
  sections: [
    {
      icon: Database,
      title: 'Information we collect',
      paragraphs: [
        'We may collect information that parents, guardians, learners and other visitors provide when they contact us, book a class, register for a program or use our website.',
      ],
      bullets: [
        'Parent or guardian names, phone numbers and email addresses.',
        'Learner names, ages, grade levels and relevant learning preferences.',
        'Class schedules, attendance, assignments, projects and learning progress.',
        'Payment and order information needed to administer services or purchases.',
        'Messages or enquiries sent through our website, email, WhatsApp or other communication channels.',
        'Basic technical information associated with website use.',
      ],
    },
    {
      icon: Eye,
      title: 'How we use information',
      paragraphs: [
        'We use personal information to provide and improve our learning services, communicate with families and operate our website.',
      ],
      bullets: [
        'Arrange trial classes and ongoing learning sessions.',
        'Recommend age-appropriate programs and learning pathways.',
        'Monitor learner progress and provide feedback to families.',
        'Respond to support requests and other enquiries.',
        'Manage payments, receipts, product orders and account administration.',
        'Improve our programs, resources and website experience.',
      ],
    },
    {
      icon: Users,
      title: 'Children’s information',
      paragraphs: [
        'Our services are designed for children and teenagers, and we expect a parent or guardian to be involved in registration and important decisions about a learner’s participation.',
        'We request learner information only where it is relevant to providing age-appropriate classes, supporting progress or communicating with the learner’s family.',
        'Parents or guardians may contact us with questions about information associated with their child.',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Sharing information',
      paragraphs: [
        'We may share limited information with tutors, administrative team members and service providers when it is necessary to deliver our programs or operate our services.',
        'Examples may include video meeting platforms, payment providers, communication services and website infrastructure providers.',
        'We do not publish learner photos, project details, parent testimonials or private communications without appropriate permission.',
      ],
    },
    {
      icon: Lock,
      title: 'Security and retention',
      paragraphs: [
        'We use reasonable administrative and technical measures to limit unauthorized access to personal information.',
        'Information is retained only for as long as needed to provide services, maintain appropriate records, resolve issues or meet applicable obligations.',
        'No online service can guarantee absolute security. Please avoid sending sensitive information through channels that are not necessary for the service being requested.',
      ],
    },
    {
      icon: Eye,
      title: 'Cookies and website activity',
      paragraphs: [
        'Our website may use cookies or similar technologies that support essential functionality, user sessions, website performance and service improvements.',
        'Browser settings may allow you to manage or remove certain cookies, although some website features may not function as expected if essential cookies are disabled.',
      ],
    },
    {
      icon: Mail,
      title: 'Questions and requests',
      paragraphs: [
        'If you would like to ask about information held by Tech Talk Hub, update your contact details or raise a privacy concern, please contact our team.',
      ],
      contacts: [EMAIL_CONTACT],
    },
  ],
}

export const TERMS_AND_CONDITIONS: PolicyPageContent = {
  badge: 'Terms & Conditions',
  title: 'Clear expectations for',
  highlightedText: 'every family.',
  description:
    'These terms outline the general expectations for using our website, booking classes and participating in Tech Talk Hub programs.',
  notice:
    'By booking a class, enrolling in a program or using our services, you agree to the applicable terms communicated by Tech Talk Hub.',
  noticeTone: 'neutral',
  sections: [
    {
      icon: BookOpen,
      title: 'Our learning services',
      paragraphs: [
        'Tech Talk Hub provides coding classes, learning resources and related educational services for children and teenagers.',
        'Program content, lesson structure, class duration and learning outcomes may vary depending on a learner’s age, experience and selected program.',
        'We aim to provide a supportive learning experience, but progress depends on attendance, participation, practice and individual learner circumstances.',
      ],
    },
    {
      icon: Users,
      title: 'Parent and guardian responsibilities',
      paragraphs: [
        'A parent or guardian should provide accurate registration details and remain responsible for authorizing a child’s participation.',
      ],
      bullets: [
        'Provide accurate learner age and contact information.',
        'Help ensure the learner has access to a suitable device and internet connection.',
        'Support attendance and appropriate participation in scheduled classes.',
        'Communicate relevant concerns or changes that may affect the learner’s experience.',
      ],
    },
    {
      icon: Calendar,
      title: 'Scheduling and attendance',
      paragraphs: [
        'Class schedules are agreed with families based on availability, program structure and tutor capacity.',
        'Requests to reschedule should be communicated as early as possible. Rescheduling arrangements, missed lessons and makeup sessions are subject to the applicable program terms communicated during enrollment.',
        'Tech Talk Hub may adjust class times, tutor assignments or delivery arrangements when reasonably necessary.',
      ],
    },
    {
      icon: CreditCard,
      title: 'Fees and payments',
      paragraphs: [
        'Program fees, payment schedules and any available trial arrangements are communicated before or during enrollment.',
        'Continued access to paid learning services may depend on timely payment of the agreed fees.',
        'Any applicable cancellation, refund or credit arrangements will be handled according to the terms communicated for the relevant program or purchase.',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Respectful participation',
      paragraphs: [
        'Learners, parents, tutors and team members are expected to communicate respectfully and support a safe learning environment.',
        'Harassment, inappropriate conduct, misuse of learning platforms or behavior that threatens another person’s safety may result in restricted access or removal from a program.',
      ],
    },
    {
      icon: FileText,
      title: 'Learning materials and content',
      paragraphs: [
        'Course materials, teaching resources, website content and other materials provided by Tech Talk Hub should be used for their intended educational purposes.',
        'Materials may not be copied, resold, redistributed or represented as another organization’s work without permission.',
        'Learner projects remain associated with the learner. Any public sharing of a child’s work should be discussed with the relevant parent or guardian.',
      ],
    },
    {
      icon: Mail,
      title: 'Questions about these terms',
      paragraphs: [
        'If you have questions about enrollment, payments, scheduling or any part of our services, contact us before making a commitment.',
      ],
      contacts: [EMAIL_CONTACT],
    },
  ],
}

export const CHILD_SAFETY_POLICY: PolicyPageContent = {
  badge: 'Child Safety & Wellbeing',
  title: 'A safer space for',
  highlightedText: 'young learners.',
  description:
    'Children learn best when they feel respected, supported and comfortable. Their wellbeing should guide every learning experience.',
  notice:
    'If a learner, parent or team member has a safety concern, contact Tech Talk Hub as soon as possible.',
  noticeTone: 'pink',
  sections: [
    {
      icon: Heart,
      title: 'Our commitment to learners',
      paragraphs: [
        'Tech Talk Hub aims to provide an online learning environment where children feel encouraged, respected and able to participate confidently.',
        'Tutors and team members are expected to act professionally, use age-appropriate language and support each learner’s wellbeing.',
      ],
    },
    {
      icon: Users,
      title: 'Parent and guardian involvement',
      paragraphs: [
        'Parents and guardians should be involved in registration, scheduling and important decisions about their child’s participation.',
      ],
      bullets: [
        'A parent or guardian should authorize the learner’s participation.',
        'Families should know when classes are scheduled and how sessions are delivered.',
        'Parents may raise questions about lesson content, communication or tutor conduct.',
        'Younger learners may need an adult nearby during online sessions.',
      ],
    },
    {
      icon: Video,
      title: 'Online class safety',
      paragraphs: [
        'Classes should take place through approved online platforms or other arrangements communicated to the family.',
        'Tutors should keep interactions focused on the lesson and use learning activities appropriate to the learner’s age.',
        'Any recording, photography or public use of class material should be handled with appropriate permission.',
      ],
    },
    {
      icon: MessageCircle,
      title: 'Appropriate communication',
      paragraphs: [
        'Communication about classes, scheduling and support should remain professional and transparent.',
        'Parents or guardians should be included in relevant communications where appropriate.',
        'Learners should not be asked to keep secrets from their parents, share unnecessary personal information or participate in conversations unrelated to their learning.',
      ],
    },
    {
      icon: Lock,
      title: 'Privacy and personal information',
      paragraphs: [
        'Learner names, photos, contact details, projects and personal information should be handled with care.',
        'We avoid requesting personal information that is not relevant to a learner’s participation or wellbeing.',
        'Parent testimonials, learner images and project showcases should only be published with appropriate permission.',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Respectful learning environment',
      paragraphs: [
        'Bullying, harassment, discriminatory behavior and inappropriate language are not acceptable.',
        'Tutors should encourage participation without embarrassing, threatening or pressuring a learner.',
        'Where a concern is reported, Tech Talk Hub may pause an interaction or class while the situation is reviewed.',
      ],
    },
    {
      icon: Eye,
      title: 'What families can do',
      bullets: [
        'Help your child attend classes from a suitable shared or supervised space.',
        'Remind them not to share passwords, private photographs or unnecessary personal details.',
        'Encourage them to tell you if an interaction makes them uncomfortable.',
        'Contact our team if something about a lesson or communication does not feel right.',
      ],
    },
    {
      icon: Mail,
      title: 'Report a concern',
      paragraphs: [
        'If you have a concern about a learner’s safety, tutor conduct, inappropriate communication or privacy, please contact Tech Talk Hub directly.',
      ],
      contacts: [EMAIL_CONTACT, { label: PHONE.display, href: PHONE.href }],
    },
  ],
}
