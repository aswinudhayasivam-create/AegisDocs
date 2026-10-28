/**
 * Configurable Rules for Key-Field Extraction (Member 2)
 * Designed for easy modification: add or tweak regex rules and keywords
 * without modifying the core extraction engine.
 */

module.exports = {
  // Document Types and their classification signatures
  documentTypes: [
    {
      id: 'AICTE_APPROVAL',
      label: 'AICTE Approval / EoA Letter',
      keywords: ['aicte', 'all india council for technical education', 'extension of approval', 'letter of approval', 'approval process'],
      priority: 1
    },
    {
      id: 'FIRE_SAFETY_NOC',
      label: 'Fire Safety Certificate / NOC',
      keywords: ['fire safety', 'fire prevention', 'no objection certificate', 'fire and rescue', 'fire service'],
      priority: 1
    },
    {
      id: 'BUILDING_LAND_SAFETY',
      label: 'Building / Land Safety Certificate',
      keywords: ['building safety', 'structural stability', 'pwd', 'land use', 'occupancy certificate', 'competent authority'],
      priority: 1
    },
    {
      id: 'FACULTY_RECORD',
      label: 'Faculty Information Record',
      keywords: ['faculty details', 'teaching staff', 'faculty record', 'assistant professor', 'associate professor', 'professor', 'qualifications'],
      priority: 1
    },
    {
      id: 'SOCIETY_REGISTRATION',
      label: 'Society / Trust Registration',
      keywords: ['societies registration', 'trust deed', 'charitable trust', 'registrar of societies'],
      priority: 2
    }
  ],

  // Field extraction definitions with regex and fallback strategies
  fieldRules: {
    institutionName: {
      label: 'Institution Name',
      patterns: [
        /(?:Name\s+of\s+(?:the\s+)?(?:Institution|College|Institute|University|Applicant)\s*[:\-]\s*)([A-Za-z0-9\s.,&'()\-]+?)(?=\r?\n|,\s*Pin|,\s*District|Certificate|Affiliated|$)/i,
        /(?:To,\s*(?:The\s+Principal(?:\s*\/\s*Director)?,\s*)?)([A-Za-z0-9\s.,&'()\-]+?(?:College|Institute|University|Academy|Polytechnic)[A-Za-z0-9\s.,&'()\-]*?)(?=\r?\n|,\s*Pin|Survey|$)/i,
        /([A-Z][A-Za-z0-9\s.,&'()\-]+?(?:College\s+of\s+Engineering|Engineering\s+College|Technical\s+College|Institute\s+of\s+Technology|Polytechnic|University)[A-Za-z0-9\s.,&'()\-]*?)(?=\r?\n|$)/i
      ],
      keywords: ['College', 'Institute', 'University', 'Academy', 'Polytechnic', 'Vidyapeeth'],
      cleaner: (val) => val.trim().replace(/^(?:To,\s*)?(?:The\s+Principal(?:\s*\/\s*Director)?,\s*)?/i, '').replace(/^[:\-\s]+/, '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    },

    certificateNumber: {
      label: 'Certificate / Approval Number',
      patterns: [
        /(?:Certificate\s+(?:No\.?|Number|Reference|Ref\.?)\s*[:\-#]?\s*)([A-Z0-9\/\-_.]+)/i,
        /(?:Approval\s+(?:No|Number|Letter\s+No|Process\s+Number)\s*[:\-#]?\s*)([A-Z0-9\/\-_.]+)/i,
        /(?:F\.\s*No\.?\s*[:\-#]?\s*)([A-Z0-9\/\-_.]+)/i,
        /(?:NOC\s*(?:No|Number)?\s*[:\-#]?\s*)([A-Z0-9\/\-_.]+)/i,
        /(?:File\s+Ref\s*[:\-#]?\s*)([A-Z0-9\/\-_.]+)/i,
        /\b([A-Z]{3,5}\/[A-Z0-9\/\-_]{5,30})\b/i
      ],
      cleaner: (val) => val.trim().replace(/^[:\-\s]+/, '').replace(/[.,;\s]+$/, '')
    },

    issueDate: {
      label: 'Issue Date',
      patterns: [
        /(?:Issue\s+Date|Date\s+of\s+Issue|Issued\s+on|Date)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
        /(?:Issue\s+Date|Date\s+of\s+Issue|Issued\s+on|Date)\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4})/i,
        /(?:Issue\s+Date|Date\s+of\s+Issue|Issued\s+on|Date)\s*[:\-]?\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i,
        /(?:Dated?)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
        /(?:Dated?)\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4})/i
      ]
    },

    expiryDate: {
      label: 'Valid Until / Expiry Date',
      patterns: [
        /(?:Valid\s+(?:Until|Upto|Up\s+to|Through|To)|Expiry\s+Date|Expiration\s+Date|Validity(?:\s+Period)?)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
        /(?:Valid\s+(?:Until|Upto|Up\s+to|Through|To)|Expiry\s+Date|Expiration\s+Date|Validity(?:\s+Period)?)\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4})/i,
        /(?:Valid\s+(?:Until|Upto|Up\s+to|Through|To)|Expiry\s+Date|Expiration\s+Date|Validity(?:\s+Period)?)\s*[:\-]?\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i,
        /(?:Academic\s+Year|Year\s+of\s+Approval)\s*[:\-]?\s*(20[0-9]{2}\s*[-–]\s*20[0-9]{2})/i
      ]
    },

    issuingAuthority: {
      label: 'Issuing Authority',
      patterns: [
        /(?:Issued\s+by|Authority|Sanctioning\s+Authority)\s*[:\-]?\s*([A-Za-z\s.,&()\-]+?)(?=\r?\n|Date|Place|$)/i,
        /(All\s+India\s+Council\s+for\s+Technical\s+Education|AICTE)/i,
        /(Directorate\s+of\s+Technical\s+Education|DTE)/i,
        /(Fire\s+(?:&\s+Rescue\s+Services|Prevention\s+and\s+Life\s+Safety|Service\s+Department))/i,
        /(Public\s+Works\s+Department|PWD)/i,
        /(National\s+Board\s+of\s+Accreditation|NBA)/i,
        /(National\s+Assessment\s+and\s+Accreditation\s+Council|NAAC)/i
      ],
      cleaner: (val) => val.trim().replace(/^[:\-\s]+/, '')
    },

    approvedIntake: {
      label: 'Approved Student Intake',
      patterns: [
        /(?:Approved\s+Intake|Total\s+Intake|Sanctioned\s+Intake)\s*[:\-]?\s*([0-9]{2,5})/i,
        /(?:Intake)\s*[:\-]?\s*([0-9]{2,5})/i
      ]
    },

    facultyId: {
      label: 'Faculty ID',
      patterns: [/Faculty\s+ID\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,19})/i]
    },

    facultyName: {
      label: 'Faculty Name',
      patterns: [/Faculty\s+Name\s*[:\-]?\s*([A-Za-z][A-Za-z.\s]{1,59}?)(?=\r?\n|$)/i]
    },

    facultyCount: {
      label: 'Total Faculty Count',
      patterns: [
        /(?:Total\s+Faculty|Number\s+of\s+Faculty|Teaching\s+Staff)\s*[:\-]?\s*([0-9]{1,4})/i,
        /(?:Faculty\s+Strength)\s*[:\-]?\s*([0-9]{1,4})/i
      ]
    }
  }
};
