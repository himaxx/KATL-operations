import { db, initDatabase } from './db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { WorkItemService, getMondayOfWeekIST } from './services/workItemService';
import { addWorkingTime, createDateFromIST, getISTComponents } from '../core/working-time/engine';
import { formatFmsDisplayNumber } from '../fms/_framework/numbering';

export interface UserTaskSpec {
  taskEn: string;
  taskHi: string;
  doerName: string;
  contact: string;
  department: string;
  designation: string;
  frequency: 'D' | 'W';
  isImportant?: boolean;
}

export const ALL_DAILY_TASKS: UserTaskSpec[] = [
  // 1. Akash Soni
  {
    doerName: 'Akash Soni',
    contact: '7771002882',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Roj ki billing complete karna or uske E-way bill as per transport check karna',
    taskHi: 'रोज की बिलिंग पूर्ण करना एवं ट्रांसपोर्ट अनुसार ई-वे बिल चेक करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Akash Soni',
    contact: '7771002882',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Bill number print krke bilty teyar krna',
    taskHi: 'बिल नंबर प्रिंट करके बिल्टी तैयार करना',
    frequency: 'D',
  },
  {
    doerName: 'Akash Soni',
    contact: '7771002882',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Accounts ka Backup drive pr daily basis',
    taskHi: 'अकाउंट्स का बैकअप गूगल ड्राइव पर लेना (दैनिक)',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Akash Soni',
    contact: '7771002882',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Sales bill banana',
    taskHi: 'सेल्स बिल बनाना',
    frequency: 'D',
  },

  // 2. Nilesh Kushwah
  {
    doerName: 'Nilesh Kushwah',
    contact: '7354538946',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Purchase, sales, file manage karna',
    taskHi: 'परचेज, सेल्स फाइल मैनेजमेंट करना',
    frequency: 'D',
  },
  {
    doerName: 'Nilesh Kushwah',
    contact: '7354538946',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Din Ke Job work Ki entry din me close karna',
    taskHi: 'दिन के जॉब वर्क की एंट्री उसी दिन क्लोज करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Nilesh Kushwah',
    contact: '7354538946',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'TDS Entry every day finish karna',
    taskHi: 'टीडीएस (TDS) एंट्री प्रतिदिन पूर्ण करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Nilesh Kushwah',
    contact: '7354538946',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Bill number print krke bilty teyar krna',
    taskHi: 'बिल नंबर प्रिंट करके बिल्टी तैयार करना',
    frequency: 'D',
  },
  {
    doerName: 'Nilesh Kushwah',
    contact: '7354538946',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Har Thursday Job work ki list teyar krna',
    taskHi: 'हर गुरुवार जॉब वर्क की लिस्ट तैयार करना',
    frequency: 'D',
  },

  // 3. Sanjay Malakar
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Purchase Bill ke part B Mangvana',
    taskHi: 'परचेज बिल का पार्ट-B मंगवाना',
    frequency: 'D',
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Purchase ki entry krke uske discount ki entry dalna',
    taskHi: 'परचेज एंट्री एवं डिस्काउंट की प्रविष्टि दर्ज करना',
    frequency: 'D',
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Debit Note and Credit Note Banana',
    taskHi: 'डेबिट नोट एवं क्रेडिट नोट बनाना',
    frequency: 'D',
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Compliance calendar ke hisab se complete krna jo agle 10 din me aane vali he',
    taskHi: 'अनुपालन कैलेंडर अनुसार अगले 10 दिन के कंप्लायंस पूरे करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Accounts ka Backup drive pr daily basis',
    taskHi: 'अकाउंट्स बैकअप ड्राइव पर अपडेट करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'Personal account update karna',
    taskHi: 'पर्सनल अकाउंट अपडेट करना',
    frequency: 'D',
  },
  {
    doerName: 'Sanjay Malakar',
    contact: '7879883549',
    department: 'Accounts',
    designation: 'Account',
    taskEn: 'TDS entry Re-check Karna',
    taskHi: 'टीडीएस (TDS) एंट्री पुनः जांचना',
    frequency: 'D',
  },

  // 4. Sapna Sahu / Sapna Madam
  {
    doerName: 'Sapna Sahu',
    contact: '8839364733',
    department: 'MDO',
    designation: 'Executive Assistence',
    taskEn: 'Delegation Task Complete karna',
    taskHi: 'डेलिगेशन कार्य पूर्ण करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Sapna Sahu',
    contact: '8839364733',
    department: 'MDO',
    designation: 'Executive Assistence',
    taskEn: 'Key Task Checklist ka follow up and completion',
    taskHi: 'मुख्य चेकलिस्ट कार्यों का फॉलो-अप व पूर्णता',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Sapna Sahu',
    contact: '8839364733',
    department: 'MDO',
    designation: 'Executive Assistence',
    taskEn: 'Office Opening and closing ka follow up',
    taskHi: 'ऑफिस खुलने व बंद होने का फॉलो-अप',
    frequency: 'D',
  },
  {
    doerName: 'Sapna Sahu',
    contact: '8839364733',
    department: 'MDO',
    designation: 'Executive Assistence',
    taskEn: 'Maintenance checklist ke task complete karna',
    taskHi: 'मेंटेनेंस चेकलिस्ट कार्य पूर्ण करना',
    frequency: 'D',
  },
  {
    doerName: 'Sapna Sahu',
    contact: '8839364733',
    department: 'MDO',
    designation: 'Executive Assistence',
    taskEn: 'Delegation Sheet Check Daily',
    taskHi: 'डेलिगेशन शीट दैनिक जांच',
    frequency: 'D',
    isImportant: true,
  },

  // 5. Rakesh Mavi
  {
    doerName: 'Rakesh Mavi',
    contact: '8839864051',
    department: 'Production',
    designation: 'Production Executive',
    taskEn: 'Daily Work Task for Rakesh Bhaiya (Warehouse & Machine Maintenance)',
    taskHi: 'दैनिक वेयरहाउस व मशीन मेंटेनेंस कार्य',
    frequency: 'D',
  },

  // 6. KR (CEO / Boss)
  {
    doerName: 'KR',
    contact: '8109014198',
    department: 'MDO',
    designation: 'CEO',
    taskEn: 'S30 Meeting Every Monday',
    taskHi: 'एस30 मीटिंग (साप्ताहिक सोमवार)',
    frequency: 'D',
  },
  {
    doerName: 'KR',
    contact: '8109014198',
    department: 'MDO',
    designation: 'CEO',
    taskEn: 'Check & Validate Every Task Of MIS + Tech Team',
    taskHi: 'एमआईएस व टेक टीम के सभी कार्यों की जांच व पुष्टि',
    frequency: 'D',
    isImportant: true,
  },

  // 7. Rahul Karande (Manager)
  {
    doerName: 'Rahul Karande',
    contact: '7869653944',
    department: 'MDO',
    designation: 'Office Manager',
    taskEn: 'Every Morning Checking Base Stocks',
    taskHi: 'प्रतिदिन सुबह बेस स्टॉक की जांच',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Rahul Karande',
    contact: '7869653944',
    department: 'MDO',
    designation: 'Office Manager',
    taskEn: 'Chennai Sell (Order Dispatch Verification)',
    taskHi: 'चेन्नई सेल (ऑर्डर डिस्पैच सत्यापन)',
    frequency: 'D',
  },
  {
    doerName: 'Rahul Karande',
    contact: '7869653944',
    department: 'MDO',
    designation: 'Office Manager',
    taskEn: 'Vastra me order entry and settle',
    taskHi: 'वस्त्रा सॉफ्टवेयर में ऑर्डर एंट्री व सेटलमेंट',
    frequency: 'D',
  },

  // 8. Himanshu Gurjar (AI Executive)
  {
    doerName: 'Himanshu Gurjar',
    contact: '6267888249',
    department: 'MDO',
    designation: 'AI executive',
    taskEn: 'Daily Automation Pipeline Runs & Verification',
    taskHi: 'दैनिक ऑटोमेशन पाइपलाइन संचालन एवं सत्यापन',
    frequency: 'D',
  },
  {
    doerName: 'Himanshu Gurjar',
    contact: '6267888249',
    department: 'MDO',
    designation: 'AI executive',
    taskEn: 'System Management & Tech Diagnostics',
    taskHi: 'सिस्टम प्रबंधन एवं तकनीकी डायग्नोस्टिक्स',
    frequency: 'D',
  },

  // 9. Harsh Malakar (MIS Executive)
  {
    doerName: 'Harsh Malakar',
    contact: '9165072008',
    department: 'MDO',
    designation: 'MIS Executive',
    taskEn: 'Daily 1 Product Video & Image using Omani',
    taskHi: 'ओमानी द्वारा प्रतिदिन 1 प्रोडक्ट वीडियो व इमेज तैयार करना',
    frequency: 'D',
  },
  {
    doerName: 'Harsh Malakar',
    contact: '9165072008',
    department: 'MDO',
    designation: 'MIS Executive',
    taskEn: 'Average Daily Sales & Top 400 Products Review',
    taskHi: 'औसत दैनिक बिक्री एवं टॉप 400 प्रोडक्ट्स विश्लेषण',
    frequency: 'D',
  },
  {
    doerName: 'Harsh Malakar',
    contact: '9165072008',
    department: 'MDO',
    designation: 'MIS Executive',
    taskEn: 'Paste Tally Data & MIS Update',
    taskHi: 'टैली डेटा पेस्ट एवं एमआईएस अपडेट',
    frequency: 'D',
    isImportant: true,
  },

  // 10. Lalita Yadav (CRM)
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Take Agent Number by Rahul Bhaiya',
    taskHi: 'राहुल भैया से एजेंट नंबर लेना',
    frequency: 'D',
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Send Images & Videos for every Customer/Agent',
    taskHi: 'प्रत्येक ग्राहक/एजेंट को फोटो व वीडियो भेजना',
    frequency: 'D',
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Customer Relation Management (For Top 150)',
    taskHi: 'टॉप 150 ग्राहकों का सीआरएम प्रबंधन',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Sales Management & Daily Order Inquiries',
    taskHi: 'सेल्स मैनेजमेंट एवं पूछताछ फॉलो-अप',
    frequency: 'D',
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Images Upload to SCM Portal',
    taskHi: 'एससीएम पोर्टल पर इमेज अपलोड करना',
    frequency: 'D',
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: '60 customers ka touch point as per calendar',
    taskHi: 'कैलेंडर अनुसार 60 ग्राहकों से संपर्क साधना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Sare Orders collect karke likhke Order form me Rahul Bhaiya Ko Dena',
    taskHi: 'सभी ऑर्डर कलेक्ट कर फॉर्म में लिखकर राहुल भैया को देना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Lalita Yadav',
    contact: '9009200757',
    department: 'MDO',
    designation: 'CRM',
    taskEn: 'Order entry in O2C FMS',
    taskHi: 'O2C एफएमएस में ऑर्डर एंट्री दर्ज करना',
    frequency: 'D',
    isImportant: true,
  },

  // 11. Kanchan Kori (Process Coordinator)
  {
    doerName: 'Kanchan Kori',
    contact: '9876543210',
    department: 'MDO',
    designation: 'Process Cordinator',
    taskEn: 'Checklist for the Office team with reminder',
    taskHi: 'ऑफिस टीम चेकलिस्ट फॉलो-अप व रिमाइंडर',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Kanchan Kori',
    contact: '9876543210',
    department: 'MDO',
    designation: 'Process Cordinator',
    taskEn: 'Check O2C & Purchase FMS me delay work ka follow up lena and reminder with call',
    taskHi: 'O2C एवं परचेज एफएमएस में लेट काम का कॉल द्वारा फॉलो-अप',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Kanchan Kori',
    contact: '9876543210',
    department: 'MDO',
    designation: 'Process Cordinator',
    taskEn: 'Dispatch Entry & Status Verification',
    taskHi: 'डिस्पैच एंट्री एवं स्थिति सत्यापन',
    frequency: 'D',
  },
  {
    doerName: 'Kanchan Kori',
    contact: '9876543210',
    department: 'MDO',
    designation: 'Process Cordinator',
    taskEn: 'LR Receiving Entry, Photo Upload',
    taskHi: 'एलआर रसीद एंट्री व फोटो अपलोड',
    frequency: 'D',
  },

  // 12. Warehouse Executives (Shared standard procedures)
  ...[
    { name: 'Ashwin Morya', contact: '7987414205' },
    { name: 'Sourabh Singhnath', contact: '9993505484' },
    { name: 'Sourabh Verma', contact: '9165661646' },
    { name: 'Sanjay Gehlot', contact: '9754261434' },
    { name: 'Mithlesh Morya', contact: '9131016665' },
    { name: 'Ankit Dadore', contact: '7869217249' },
    { name: 'Manohar Deshmukh', contact: '7987570313' },
    { name: 'Bunty Kushwah', contact: '9754143682' },
    { name: 'Naresh Deshmukh', contact: '9644353567' },
  ].flatMap((w) => [
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Vastra Se Real stock tally karna',
      taskHi: 'वस्त्रा सॉफ्टवेयर से वास्तविक स्टॉक मिलान करना',
      frequency: 'D' as const,
      isImportant: true,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Sample room me best 400 ka sample check',
      taskHi: 'सैंपल रूम में बेस्ट 400 सैंपल्स की जांच',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Check photo and tags in vastra',
      taskHi: 'वस्त्रा में फोटो एवं टैग्स की जांच',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Roj aaye huye naye maal me photos fit krna',
      taskHi: 'रोज आए नए माल में फोटो टैगिंग पूर्ण करना',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Production order dena vastra and pms',
      taskHi: 'वस्त्रा एवं पीएमएस में प्रोडक्शन ऑर्डर जारी करना',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Sare product ki jankari hona requirement ke hisab se',
      taskHi: 'मांग अनुसार सभी प्रोडक्ट्स की जानकारी अपडेट रखना',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Net rate and gross rate ke photo apne groups ke nikal ke rkhna (Ketan format)',
      taskHi: 'नेट व ग्रॉस रेट के फोटो केतन भैया के फॉर्मेट अनुसार ग्रुप में भेजना',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Roz 3 photos vastra me update karna',
      taskHi: 'रोज 3 फोटो वस्त्रा में अपडेट करना',
      frequency: 'D' as const,
    },
    {
      doerName: w.name,
      contact: w.contact,
      department: 'Warehouse',
      designation: 'Warehouse Executive',
      taskEn: 'Vastra me apne 5 Items ke Name Update karna',
      taskHi: 'वस्त्रा में अपने 5 आइटम्स के नाम अपडेट करना',
      frequency: 'D' as const,
    },
  ]),

  // 13. Kapil Raghuvanshi
  {
    doerName: 'Kapil Raghuvanshi',
    contact: '9926150004',
    department: 'Warehouse',
    designation: 'Warehouse Executive',
    taskEn: 'Roz Ke Maal me jo bhi outward gaya uski Job Slip Banana (Ashok se)',
    taskHi: 'रोज के आउटवर्ड माल की जॉब स्लिप बनाना (अशोक से)',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Kapil Raghuvanshi',
    contact: '9926150004',
    department: 'Warehouse',
    designation: 'Warehouse Executive',
    taskEn: 'Jo Finish ho ke good inward aaya Ashok se Job Slip banana',
    taskHi: 'फिनिश होकर आए इनवर्ड माल की जॉब स्लिप बनाना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Kapil Raghuvanshi',
    contact: '9926150004',
    department: 'Warehouse',
    designation: 'Warehouse Executive',
    taskEn: 'Boys ke maal kaa all production or stock ko tally karna',
    taskHi: 'बॉयज माल का कुल प्रोडक्शन व स्टॉक मिलान करना',
    frequency: 'D',
  },

  // 14. Naval Raghuvanshi
  {
    doerName: 'Naval Raghuvanshi',
    contact: '9827394885',
    department: 'Warehouse',
    designation: 'Warehouse Executive',
    taskEn: 'Roj Ke 10 Payments call lagana',
    taskHi: 'प्रतिदिन 10 पेमेंट्स के लिए कॉल लगाना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Naval Raghuvanshi',
    contact: '9827394885',
    department: 'Warehouse',
    designation: 'Warehouse Executive',
    taskEn: 'Roj 3 naye Karigaro se baat karna',
    taskHi: 'प्रतिदिन 3 नए कारीगरों से संपर्क करना',
    frequency: 'D',
  },

  // 15. Manoj Bhaiya (Warehouse Manager)
  {
    doerName: 'Manoj Bhaiya',
    contact: '7771000411',
    department: 'Warehouse',
    designation: 'Warehouse Manager',
    taskEn: 'Pending Order Report se Order ka status Update krna (11:00 Daily)',
    taskHi: 'पेंडिंग ऑर्डर रिपोर्ट से स्टेटस अपडेट करना (सुबह 11:00 बजे)',
    frequency: 'D',
    isImportant: true,
  },

  // 16. Ashok Bhalse (Production Manager)
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: 'Rough Material IMS me fill karna he',
    taskHi: 'कच्चा माल (RM) आईएमएस में दर्ज करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: '2 Thekedar ka Minimum data check karke unke signature lena he',
    taskHi: 'कम से कम 2 ठेकेदारों का डेटा चेक कर हस्ताक्षर लेना',
    frequency: 'D',
  },
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: 'Din ki sabhi job works and slips ki entry outward ki complete karna he',
    taskHi: 'दिन के सभी जॉब वर्क व स्लिप्स की आउटवर्ड एंट्री पूर्ण करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: 'Sabhi Inward ki entry complete karna he',
    taskHi: 'सभी इनवर्ड माल की एंट्री पूर्ण करना',
    frequency: 'D',
    isImportant: true,
  },
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: 'At least 10 Items ka Job rate update karna he vastra me',
    taskHi: 'वस्त्रा में कम से कम 10 आइटम्स का जॉब रेट अपडेट करना',
    frequency: 'D',
  },
  {
    doerName: 'Ashok Bhalse',
    contact: '7746872673',
    department: 'Production',
    designation: 'Production Manager',
    taskEn: 'Jitne bhi bill receive ho uspar seal lagana PMS me entry karke uper jama karna',
    taskHi: 'प्राप्त बिलों पर सील लगाकर पीएमएस एंट्री कर ऊपर जमा करना',
    frequency: 'D',
    isImportant: true,
  },

  // 17. Santosh Rajput (Production Executive)
  {
    doerName: 'Santosh Rajput',
    contact: '9399906456',
    department: 'Production',
    designation: 'Production Executive',
    taskEn: 'Santosh Bhaiya ko rozana RM-IMS me entry karni hai',
    taskHi: 'संतोष भैया को रोज़ाना RM-IMS में एंट्री करनी है।',
    frequency: 'D',
    isImportant: true,
  },

  // 18. Seema Singh (Receptionist)
  {
    doerName: 'Seema Singh',
    contact: '7007448370',
    department: 'MDO',
    designation: 'Receptionist',
    taskEn: 'Stock Check Of Packaging Polythene & Supplies',
    taskHi: 'पैकेजिंग पॉलिथीन एवं सप्लाइज का स्टॉक चेक करना',
    frequency: 'D',
  },
];

export function ensureDailyWorkItemsForToday() {
  const nowIST = getISTComponents(new Date());
  const todayAvailableFrom = createDateFromIST(nowIST.year, nowIST.month, nowIST.date, 10, 0, 0);
  const todayPlannedAt = createDateFromIST(nowIST.year, nowIST.month, nowIST.date, 20, 0, 0); // 8:00 PM IST
  const nowIso = new Date().toISOString();
  const weekStartDate = getMondayOfWeekIST(todayPlannedAt);

  console.log(`Checking daily repetitive tasks for today (${nowIST.dateStr})...`);

  try {
    const batchSql = `
      WITH inserted_items AS (
        INSERT INTO work_items (
          id, source_module, source_ref_id, assignee_user_id,
          title_en, title_hi, is_important, available_from, planned_at,
          status, created_at, task_type
        )
        SELECT 
          ('wi-cl-' || cd.id || '-' || to_char($1::timestamptz AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')) AS id,
          'checklist',
          cd.id,
          cd.target_id,
          cd.title_en,
          cd.title_hi,
          cd.is_important,
          $2::timestamptz,
          $1::timestamptz,
          'OPEN',
          $3::timestamptz,
          'REPETITIVE'
        FROM checklist_definitions cd
        WHERE cd.is_active = TRUE 
          AND cd.frequency = 'DAILY'
          AND cd.target_type = 'USER'
        ON CONFLICT (id) DO NOTHING
        RETURNING id, assignee_user_id, is_important, created_at
      )
      INSERT INTO score_events (id, user_id, work_item_id, week_start_date, weight, is_done, is_on_time, updated_at)
      SELECT 
        ('se-' || ii.id),
        ii.assignee_user_id,
        ii.id,
        $4,
        CASE WHEN ii.is_important THEN 3 ELSE 1 END,
        FALSE,
        FALSE,
        ii.created_at
      FROM inserted_items ii
      ON CONFLICT (work_item_id) DO NOTHING;
    `;

    db.prepare(batchSql).run(
      todayPlannedAt.toISOString(),
      todayAvailableFrom.toISOString(),
      nowIso,
      weekStartDate
    );

    console.log(`✅ Daily repetitive tasks verified/generated for today (${nowIST.dateStr}).`);
  } catch (err: any) {
    console.error('Error generating daily repetitive tasks:', err.message);
  }
}

export async function seedDatabase() {
  initDatabase();

  const userCount = Number((db.prepare('SELECT count(*) as cnt FROM users').get() as any)?.cnt || 0);
  const checklistDefCount = Number((db.prepare('SELECT count(*) as cnt FROM checklist_definitions').get() as any)?.cnt || 0);

  if (userCount >= 28 && checklistDefCount >= 100) {
    console.log(`✅ Supabase Database ready (${userCount} staff users, ${checklistDefCount} checklist definitions).`);
    ensureDailyWorkItemsForToday();
    return;
  }

  console.log('Seeding Supabase database for Ketan Aditya Ops...');

  const passwordHashOwner = await bcrypt.hash('Hello@Ketan', 10);
  const passwordHashMandate = await bcrypt.hash('MIS@Ketan', 10);
  const defaultPinHash = await bcrypt.hash('1234', 10);
  const now = new Date().toISOString();

  // 1. Seed Owner and Mandate Holder
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, mobile, email, pin_hash, password_hash, role, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
  `);

  insertUser.run('user-owner', 'Owner (Ketan Aditya)', '9999900000', 'hello@ketan', defaultPinHash, passwordHashOwner, 'OWNER', now);
  insertUser.run('user-mandate', 'Master Admin (MIS)', '9999900001', 'mis@ketan', defaultPinHash, passwordHashMandate, 'MANDATE_HOLDER', now);

  // 2. Seed Designations
  const designationsList = [
    { name: 'CEO', dept: 'MDO' },
    { name: 'Office Manager', dept: 'MDO' },
    { name: 'Executive Assistence', dept: 'MDO' },
    { name: 'MIS Executive', dept: 'MDO' },
    { name: 'AI executive', dept: 'MDO' },
    { name: 'Process Cordinator', dept: 'MDO' },
    { name: 'CRM', dept: 'MDO' },
    { name: 'Receptionist', dept: 'MDO' },
    { name: 'Account', dept: 'Accounts' },
    { name: 'Production Manager', dept: 'Production' },
    { name: 'Production Executive', dept: 'Production' },
    { name: 'Warehouse Manager', dept: 'Warehouse' },
    { name: 'Warehouse Executive', dept: 'Warehouse' },
  ];

  const insertDesig = db.prepare('INSERT OR IGNORE INTO designations (id, name, department) VALUES (?, ?, ?)');
  const desigMap = new Map<string, string>();

  for (const d of designationsList) {
    const id = `desig-${d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    insertDesig.run(id, d.name, d.dept);
    desigMap.set(d.name, id);
  }

  // 3. Assign Capabilities
  const insertCap = db.prepare('INSERT OR IGNORE INTO designation_capabilities (designation_id, capability) VALUES (?, ?)');
  if (desigMap.has('Process Cordinator')) {
    insertCap.run(desigMap.get('Process Cordinator')!, 'DELAY_DASHBOARD');
    insertCap.run(desigMap.get('Process Cordinator')!, 'AUDIT');
  }
  if (desigMap.has('Executive Assistence')) {
    insertCap.run(desigMap.get('Executive Assistence')!, 'DELEGATION_SHEET');
    insertCap.run(desigMap.get('Executive Assistence')!, 'IMPORTANT_MISS_ALERT');
  }
  if (desigMap.has('MIS Executive')) {
    insertCap.run(desigMap.get('MIS Executive')!, 'VIDEO_BACKLOG');
  }

  // 4. Seed Users from user_list.csv
  const staffMembers = [
    { name: 'Akash Soni', desig: 'Account', dept: 'Accounts', contact: '7771002882' },
    { name: 'Ankit Dadore', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '7869217249' },
    { name: 'Ashok Bhalse', desig: 'Production Manager', dept: 'Production', contact: '7746872673' },
    { name: 'Ashwin Morya', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '7987414205' },
    { name: 'Bunty Kushwah', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9754143682' },
    { name: 'Harsh Malakar', desig: 'MIS Executive', dept: 'MDO', contact: '9165072008' },
    { name: 'Himanshu Gurjar', desig: 'AI executive', dept: 'MDO', contact: '6267888249' },
    { name: 'Kanchan Kori', desig: 'Process Cordinator', dept: 'MDO', contact: '9876543210' },
    { name: 'Kapil Raghuvanshi', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9926150004' },
    { name: 'KR', desig: 'CEO', dept: 'MDO', contact: '8109014198' },
    { name: 'Lalita Yadav', desig: 'CRM', dept: 'MDO', contact: '9009200757' },
    { name: 'Manohar Deshmukh', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '7987570313' },
    { name: 'Manoj Bhaiya', desig: 'Warehouse Manager', dept: 'Warehouse', contact: '7771000411' },
    { name: 'Mithlesh Morya', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9131016665' },
    { name: 'Naresh Deshmukh', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9644353567' },
    { name: 'Naval Raghuvanshi', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9827394885' },
    { name: 'Nilesh Kushwah', desig: 'Account', dept: 'Accounts', contact: '7354538946' },
    { name: 'Rahul Karande', desig: 'Office Manager', dept: 'MDO', contact: '7869653944' },
    { name: 'Rakesh Mavi', desig: 'Production Executive', dept: 'Production', contact: '8839864051' },
    { name: 'Sanjay Gehlot', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9754261434' },
    { name: 'Sanjay Malakar', desig: 'Account', dept: 'Accounts', contact: '7879883549' },
    { name: 'Santosh Rajput', desig: 'Production Executive', dept: 'Production', contact: '9399906456' },
    { name: 'Sapna Sahu', desig: 'Executive Assistence', dept: 'MDO', contact: '8839364733' },
    { name: 'Seema Singh', desig: 'Receptionist', dept: 'MDO', contact: '7007448370' },
    { name: 'Sourabh Singhnath', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9993505484' },
    { name: 'Sourabh Verma', desig: 'Warehouse Executive', dept: 'Warehouse', contact: '9165661646' },
  ];

  const insertUserDesig = db.prepare('INSERT OR IGNORE INTO user_designations (user_id, designation_id) VALUES (?, ?)');

  for (const staff of staffMembers) {
    const userId = `user-${staff.contact}`;
    const userRole = 'USER';
    
    insertUser.run(
      userId,
      staff.name,
      staff.contact,
      `${staff.contact}@katl.ops`,
      defaultPinHash,
      null,
      userRole,
      now
    );

    // Ensure role is USER for staff members including KR
    db.prepare("UPDATE users SET role = 'USER' WHERE mobile = ?").run(staff.contact);

    const desigId = desigMap.get(staff.desig);
    if (desigId) {
      insertUserDesig.run(userId, desigId);
    }
  }

  // 4b. Seed User Systems from CSV (Process Involvement column)
  // System codes: CL = Checklist, O2C = Order to Collection, Purchase = Purchase FMS
  const insertUserSystem = db.prepare('INSERT OR IGNORE INTO user_systems (user_id, system_code) VALUES (?, ?)');

  // Users with O2C access (in addition to CL)
  const o2cUsers = [
    '9009200757', // Lalita Yadav (CRM)
    '9165072008', // Harsh Malakar (MIS / VASTRA)
    '7771002882', // Akash Soni (Accounts)
    '7879883549', // Sanjay Malakar (Accounts)
    '7024628005', // Sanjay Malakar
    '7771000411', // Manoj Bhaiya (Warehouse / Dispatch)
    '9685002014', // Manoj Bhaiya
    '8109014198', // KR (Problem Solver / PSDM)
    '9827055000', // KR
    '6267888249', // Himanshu Gurjar
    '8839364733', // Sapna Sahu
  ];
  // Users with Purchase access (in addition to CL)
  const purchaseUsers = ['8109014198', '7771000411', '7879883549', '9399906456', '8839364733']; // KR, Manoj Bhaiya, Sanjay Malakar, Santosh Rajput, Sapna Sahu

  for (const staff of staffMembers) {
    const uid = `user-${staff.contact}`;
    // Everyone gets CL
    insertUserSystem.run(uid, 'CL');
    if (o2cUsers.includes(staff.contact)) {
      insertUserSystem.run(uid, 'O2C');
    }
    if (purchaseUsers.includes(staff.contact)) {
      insertUserSystem.run(uid, 'Purchase');
    }
  }
  // Owner and Mandate Holder get all systems
  insertUserSystem.run('user-owner', 'CL');
  insertUserSystem.run('user-owner', 'O2C');
  insertUserSystem.run('user-owner', 'Purchase');
  insertUserSystem.run('user-mandate', 'CL');
  insertUserSystem.run('user-mandate', 'O2C');
  insertUserSystem.run('user-mandate', 'Purchase');


  // 5. Seed Master Lists
  const insertMaster = db.prepare('INSERT OR IGNORE INTO master_lists (id, list_key, item_value, extra_json) VALUES (?, ?, ?, ?)');
  
  const fabricList = [
    { en: '104 Matty', hi: '104 मैटी' },
    { en: 'Cotton Print', hi: 'कॉटन प्रिंट' },
    { en: 'Denim', hi: 'डेनिम' },
    { en: 'Digital Satan (Tain dain)', hi: 'डिजिटल शैतान (टैन डैन)' },
    { en: 'Hangama Bubble', hi: 'हंगामा बबल' },
    { en: 'Kenzo plain', hi: 'केन्ज़ो प्लेन' },
    { en: 'Kenzo Print', hi: 'केन्ज़ो प्रिंट' },
    { en: 'Nato Checks Bubble', hi: 'नाटो चेक बबल' },
    { en: 'Nykra', hi: 'नाइकरा' },
    { en: 'Platting plain', hi: 'समतल प्लॉटिंग' },
    { en: 'RFD', hi: 'आरएफडी' },
    { en: 'RIB print', hi: 'आरआईबी प्रिंट' },
    { en: 'Riyan 22kg', hi: 'रियान 22 किग्रा' },
    { en: 'Riyan Foil', hi: 'रियान फ़ॉइल' },
    { en: 'Riyan Plain', hi: 'रियान मैदान' },
    { en: 'Riyan print', hi: 'रियान प्रिंट' },
    { en: 'Saree crap', hi: 'साड़ी बकवास' },
    { en: 'Satan foil', hi: 'शैतान विफल' },
    { en: 'Satan plain', hi: 'शैतान सादा' },
    { en: 'Seemar platting', hi: 'सीमार प्लैटिंग' },
    { en: 'Sincker', hi: 'सिंकर' },
    { en: 'Tain dain Print ( Vishnu Foil /Digital print)', hi: 'टैन डैन प्रिंट (विष्णु फ़ॉइल/डिजिटल प्रिंट)' },
    { en: 'Tencil Plain', hi: 'टेन्सिल प्लेन' },
    { en: 'Vako RIB plain', hi: 'वाको आरआईबी प्लेन' },
  ];

  for (const f of fabricList) {
    insertMaster.run(
      `ml-fabrics-${f.en.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      'fabrics',
      f.en,
      JSON.stringify({ hindi: f.hi })
    );
  }

  const agentList = [
    { name: 'Mansi Textiles', phone: '9165072008' },
    { name: 'shekhani Textiles', phone: '8109385126' },
    { name: 'Ramesh Bhai Agency', phone: '9876543210' },
    { name: 'Deepak Brokerage', phone: '9826012345' },
    { name: 'Direct Buyer Account', phone: '9000000000' },
    { name: 'Mukesh Sharma & Sons', phone: '9827011223' },
  ];

  for (const ag of agentList) {
    insertMaster.run(
      `ml-agents-${ag.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      'agents',
      ag.name,
      JSON.stringify({ phone: ag.phone })
    );
  }

  const transportList = [
    'VRL LOGISTICS',
    'SAFEX EXPRESS',
    'XPS',
    'YASHWANT',
    'KTC',
    'EXPRESS BEES',
    'BATCO',
    'GATI',
    'RIVEGO',
    'SRD',
    'MAHARAJA CARRIER',
    'BALAJI',
    'GOLDEN',
    'OM LOGISTICS',
    'BLUE DART',
    'TCL LUCKY BAGGA',
    'MAHARAJA RAIL',
    'GIRNAR',
    'ARCL',
    'IRC',
    'OK EXPRESS',
    'APS',
  ];

  for (const tr of transportList) {
    insertMaster.run(
      `ml-transports-${tr.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      'transports',
      tr,
      '{}'
    );
  }

  const masterData: Record<string, string[]> = {
    customers: [
      'A To Z Emporium,Kanpur',
      'A.K. Jauali',
      'Abc, Bihar',
      'Ahmed Brothers,Trichy',
      'Akash Silk Readymade Tiruvannmalai',
      'Ananda The Family Shop, Chennai',
      'Andavr Fashion,Gummidipoondi',
      'Ar Rehman Singapore Textiles',
      'Aruna Silks',
      'Ashvin Silks Wanpet',
      'Athikalathu Alagngara Maligai,Pudukkottai',
      'Aura Clothing, Chidambaram',
      'Bhairavi Textiles Rasipuram',
      'Bismi Cut Peice',
      'Bsc Texlile, Davanagere',
      'Bsc, Shivamoga',
      'Shree Ganesh Textiles (Indore)',
      'Vardhman Apparels (Surat)',
      'Bombay Garments (Mumbai)',
      'Surat Fashion Hub',
      'Jaipur Cottons Corp',
      'Mahalaxmi Fabrics',
    ],
    vendors: ['Arvind Mills Ltd', 'Vardhman Polytex', 'KCT Buttons & Zippers', 'Surat Quality Thread Mart', 'Apex Labels & Tags'],
    thekedars: ['Master Aslam (Unit 1 Stitching)', 'Master Raju (Kurti Specialist)', 'Ramesh Thekedar', 'Irfan Bhai Cutting & Tailoring'],
    pressmen: ['Rakesh Pressman', 'Suresh Steam Ironing', 'Dinesh Finishing & Press'],
  };
  for (const [key, items] of Object.entries(masterData)) {
    for (const item of items) {
      insertMaster.run(`ml-${key}-${item.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, key, item, '{}');
    }
  }

  // 6. Seed Holidays (2026/2027)
  const insertHoliday = db.prepare('INSERT OR IGNORE INTO holidays (id, date, title) VALUES (?, ?, ?)');
  const holidays = [
    { date: '2026-01-26', title: 'Republic Day' },
    { date: '2026-03-04', title: 'Holi' },
    { date: '2026-08-15', title: 'Independence Day' },
    { date: '2026-10-02', title: 'Gandhi Jayanti' },
    { date: '2026-10-20', title: 'Dussehra' },
    { date: '2026-11-08', title: 'Diwali' },
    { date: '2026-12-25', title: 'Christmas' },
  ];
  for (const h of holidays) {
    insertHoliday.run(`hol-${h.date}`, h.date, h.title);
  }

  // 7. Seed All Daily Checklist Definitions and Active Work Items for Today
  const insertChecklistDef = db.prepare(`
    INSERT OR REPLACE INTO checklist_definitions (
      id, title_en, title_hi, target_type, target_id, frequency, start_date, due_time, is_important, video_url, is_active, created_at
    ) VALUES (?, ?, ?, 'USER', ?, 'DAILY', '2026-08-01', '20:00', ?, null, TRUE, ?)
  `);

  // Target today's working window in IST: available_from 10:00 AM IST, planned_at 8:00 PM (20:00 IST)
  const nowIST = getISTComponents(new Date());
  const todayAvailableFrom = createDateFromIST(nowIST.year, nowIST.month, nowIST.date, 10, 0, 0);
  const todayPlannedAt = createDateFromIST(nowIST.year, nowIST.month, nowIST.date, 20, 0, 0); // 8:00 PM IST

  console.log(`Generating daily checklist items for ${ALL_DAILY_TASKS.length} tasks...`);

  for (let i = 0; i < ALL_DAILY_TASKS.length; i++) {
    const task = ALL_DAILY_TASKS[i];
    const userId = `user-${task.contact}`;
    const defId = `cl-def-${i + 1}`;

    insertChecklistDef.run(
      defId,
      task.taskEn,
      task.taskHi,
      userId,
      Boolean(task.isImportant),
      now
    );

    // Create live daily work item for today if not already existing
    const existing = db.prepare(`
      SELECT id FROM work_items 
      WHERE source_module = 'checklist' AND source_ref_id = ? AND DATE(planned_at) = DATE(?)
    `).get(defId, todayPlannedAt.toISOString());

    if (!existing) {
      WorkItemService.createWorkItem({
        source_module: 'checklist',
        source_ref_id: defId,
        assignee_user_id: userId,
        title_en: task.taskEn,
        title_hi: task.taskHi,
        is_important: Boolean(task.isImportant),
        available_from: todayAvailableFrom,
        planned_at: todayPlannedAt,
      });
    }
  }

  console.log('Database seeded successfully with all daily tasks!');
}
