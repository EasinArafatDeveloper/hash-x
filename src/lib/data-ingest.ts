/**
 * Smart Upsert & Data Ingestion Engine for Morpheus DataFlow
 * 
 * CORE RULES:
 * 1. Mobile Number (phone) is the unique primary identifier.
 * 2. If phone exists in DB -> SMART PARTIAL UPDATE.
 * 3. If phone does not exist in DB -> CREATE NEW RECORD.
 * 4. Only fields that the user explicitly mapped (not 'skip') and with non-empty values update existing records.
 * 5. 'skip' or unmapped fields NEVER delete, empty, or overwrite existing database data.
 * 6. Empty/null values in the uploaded file NEVER overwrite existing database values.
 * 7. Duplicate phone numbers across uploads or within the same file update the single record without duplicates.
 */

export interface ParsedRowData {
  phone: string;
  email: string;
  providedFields: Record<string, any>;
  providedCustomFields: Record<string, any>;
  providedTags: string[];
}

export interface DiffEntry {
  field: string;
  from: string;
  to: string;
}

export interface RecordUpdateResult {
  hasChanges: boolean;
  updateFields: Record<string, any>;
  changedList: string[];
  diffs: DiffEntry[];
}

/**
 * Cleans string representation of arrays (e.g. '[]' -> '', '["keraniganj"]' -> 'keraniganj')
 */
export function cleanArrayString(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (!s || s === '[]' || s === '[""]' || s === "['']" || s === 'null' || s === 'undefined') return '';
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean).join(', ');
      }
    } catch {
      return s.replace(/^\[\s*["']?/, '').replace(/["']?\s*\]$/, '').replace(/["']/g, '').trim();
    }
  }
  return s;
}

/**
 * Parses an incoming file row according to custom mapping or heuristic auto-detection.
 * Strictly respects 'skip' and empty values: only valid, non-empty, non-skipped values
 * are added to providedFields / providedCustomFields.
 */
export function parseRowData(
  row: Record<string, any>,
  columnMapping?: Record<string, string>,
  batchTags: string[] = [],
  customCategory?: string,
  customAttributes?: Record<string, any>
): ParsedRowData {
  const providedFields: Record<string, any> = {};
  const providedCustomFields: Record<string, any> = {};
  const providedTags: string[] = [];

  // Add batch tags if provided
  if (Array.isArray(batchTags) && batchTags.length > 0) {
    batchTags.forEach((t) => {
      const str = String(t || '').trim();
      if (str && !providedTags.includes(str)) providedTags.push(str);
    });
  }

  // Add custom attributes if provided
  if (customAttributes && typeof customAttributes === 'object') {
    Object.assign(providedCustomFields, customAttributes);
  }

  const hasCustomMapping =
    columnMapping &&
    typeof columnMapping === 'object' &&
    Object.keys(columnMapping).length > 0;

  if (hasCustomMapping) {
    // 1. User Explicit Column Mapping
    Object.keys(row).forEach((key) => {
      const targetField = columnMapping[key];
      const val = row[key];

      // If value is null, undefined, or empty string -> ignore completely
      if (val === null || val === undefined || String(val).trim() === '') return;

      // If mapped to 'skip' -> ignore completely (preserve existing DB value)
      if (targetField === 'skip') return;

      const strVal = String(val).trim();

      if (targetField === 'phone') {
        providedFields.phone = strVal;
      } else if (targetField === 'name') {
        providedFields.name = strVal;
        providedCustomFields['customer_name'] = strVal;
        providedCustomFields['Customer Name'] = strVal;
      } else if (targetField === 'address') {
        providedFields.address = strVal;
        providedCustomFields['canonical_address'] = strVal;
        providedCustomFields['Canonical Address'] = strVal;
      } else if (targetField === 'gender') {
        const gStr = strVal.toLowerCase();
        let g = 'Other';
        if (gStr.startsWith('m')) g = 'Male';
        else if (gStr.startsWith('f')) g = 'Female';
        providedFields.gender = g;
        providedCustomFields['gender'] = g;
        providedCustomFields['Gender'] = g;
      } else if (targetField === 'whatsapp_status') {
        const cleanStatus = cleanArrayString(strVal) || strVal;
        providedCustomFields['whatsapp_status'] = cleanStatus;
        providedCustomFields['WhatsApp Status'] = cleanStatus;
      } else if (targetField === 'matched_order_count') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['matched_order_count'] = num;
          providedCustomFields['Matched Order Count'] = num;
          if (providedFields.orderCount === undefined) providedFields.orderCount = num;
        } else {
          providedCustomFields['matched_order_count'] = strVal;
        }
      } else if (targetField === 'lifetime_order_count' || targetField === 'orderCount') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedFields.orderCount = num;
          providedCustomFields['lifetime_order_count'] = num;
          providedCustomFields['Lifetime Order Count'] = num;
          providedCustomFields['Order Count'] = num;
        } else {
          providedCustomFields['lifetime_order_count'] = strVal;
        }
      } else if (targetField === 'matched_net_order_amount_bdt') {
        const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          providedCustomFields['matched_net_order_amount_bdt'] = num;
          providedCustomFields['Matched Order Amount BDT'] = num;
          if (providedFields.orderAmount === undefined) providedFields.orderAmount = num;
        } else {
          providedCustomFields['matched_net_order_amount_bdt'] = strVal;
        }
      } else if (targetField === 'lifetime_net_order_amount_bdt' || targetField === 'orderAmount') {
        const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          providedFields.orderAmount = num;
          providedCustomFields['lifetime_net_order_amount_bdt'] = num;
          providedCustomFields['Lifetime Order Amount BDT'] = num;
          providedCustomFields['Order Amount'] = num;
        } else {
          providedCustomFields['lifetime_net_order_amount_bdt'] = strVal;
        }
      } else if (targetField === 'prepaid_order_count') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['prepaid_order_count'] = num;
          providedCustomFields['Prepaid Order Count'] = num;
        } else {
          providedCustomFields['prepaid_order_count'] = strVal;
        }
      } else if (targetField === 'matched_unique_merchant_count') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['matched_unique_merchant_count'] = num;
          providedCustomFields['Matched Unique Merchant Count'] = num;
        } else {
          providedCustomFields['matched_unique_merchant_count'] = strVal;
        }
      } else if (targetField === 'lifetime_unique_merchant_count') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['lifetime_unique_merchant_count'] = num;
          providedCustomFields['Lifetime Unique Merchant Count'] = num;
        } else {
          providedCustomFields['lifetime_unique_merchant_count'] = strVal;
        }
      } else if (targetField === 'primary_merchant') {
        const cleanMerchant = cleanArrayString(strVal) || strVal;
        providedCustomFields['primary_merchant'] = cleanMerchant;
        providedCustomFields['Primary Merchant'] = cleanMerchant;
      } else if (targetField === 'matched_district_filters') {
        const cleanDistrict = cleanArrayString(strVal);
        providedCustomFields['matched_district_filters'] = cleanDistrict;
        providedCustomFields['Matched District'] = cleanDistrict;
        if (cleanDistrict && !providedFields.location) providedFields.location = cleanDistrict;
      } else if (targetField === 'matched_city_filters') {
        const cleanCity = cleanArrayString(strVal);
        providedCustomFields['matched_city_filters'] = cleanCity;
        providedCustomFields['Matched City'] = cleanCity;
        if (cleanCity && (!providedFields.location || providedFields.location === '[]')) providedFields.location = cleanCity;
      } else if (targetField === 'matched_area_filters' || targetField === 'area') {
        const cleanArea = cleanArrayString(strVal);
        providedCustomFields['matched_area_filters'] = cleanArea;
        providedCustomFields['Matched Area'] = cleanArea;
        if (cleanArea) providedFields.area = cleanArea;
      } else if (targetField === 'matched_block_road_filters') {
        const cleanBlock = cleanArrayString(strVal);
        providedCustomFields['matched_block_road_filters'] = cleanBlock;
        providedCustomFields['Matched Block / Road'] = cleanBlock;
      } else if (targetField === 'inferred_primary_area') {
        const cleanInferred = cleanArrayString(strVal);
        providedCustomFields['inferred_primary_area'] = cleanInferred;
        providedCustomFields['Inferred Primary Area'] = cleanInferred;
        if (cleanInferred && (!providedFields.area || providedFields.area === '[]')) providedFields.area = cleanInferred;
      } else if (targetField === 'lifetime_frequency_segment') {
        const cleanFreq = cleanArrayString(strVal) || strVal;
        providedCustomFields['lifetime_frequency_segment'] = cleanFreq;
        providedCustomFields['Frequency Segment'] = cleanFreq;
      } else if (targetField === 'lifetime_value_segment') {
        const cleanVal = cleanArrayString(strVal) || strVal;
        providedCustomFields['lifetime_value_segment'] = cleanVal;
        providedCustomFields['Value Segment'] = cleanVal;
      } else if (targetField === 'lifetime_primary_category') {
        const cleanCat = cleanArrayString(strVal) || strVal;
        providedFields.category = cleanCat;
        providedCustomFields['lifetime_primary_category'] = cleanCat;
        providedCustomFields['Primary Category'] = cleanCat;
      } else if (targetField === 'email') {
        providedFields.email = strVal;
      } else if (targetField === 'age') {
        const num = parseInt(strVal, 10);
        if (!isNaN(num)) providedFields.age = num;
      } else if (targetField === 'location') {
        const cleanLoc = cleanArrayString(strVal) || strVal;
        providedFields.location = cleanLoc;
      } else if (targetField === 'avatarUrl') {
        if (strVal.startsWith('http://') || strVal.startsWith('https://')) {
          providedFields.avatarUrl = strVal;
          providedFields.avatarOriginalUrl = strVal;
          providedFields.avatarType = 'With Avatar';
        } else if (strVal) {
          providedFields.avatarType = strVal;
        }
      } else if (targetField === 'avatarType') {
        providedFields.avatarType = strVal;
      } else if (targetField === 'tags') {
        strVal.split(',').forEach((t) => {
          const ct = cleanArrayString(t).trim();
          if (ct && !providedTags.includes(ct)) providedTags.push(ct);
        });
      } else if (targetField === 'category') {
        providedFields.category = cleanArrayString(strVal) || strVal;
      } else if (targetField === 'status') {
        providedFields.status = ['Active', 'Inactive', 'Pending', 'Suspended'].includes(strVal) ? strVal : 'Active';
      } else if (targetField === 'activeDays') {
        const num = parseInt(strVal, 10);
        if (!isNaN(num)) providedFields.activeDays = num;
      } else if (targetField === 'lastActive') {
        const parsedDate = new Date(val);
        if (!isNaN(parsedDate.getTime())) providedFields.lastActive = parsedDate;
      } else {
        providedCustomFields[key] = val;
      }
    });
  } else {
    // 2. Automated Heuristic Recognition
    Object.keys(row).forEach((key) => {
      const lowerKey = key.trim().toLowerCase().replace(/[\s_\.-]+/g, '');
      const val = row[key];
      if (val === null || val === undefined || String(val).trim() === '') return;
      const strVal = String(val).trim();

      if (
        lowerKey === 'phone' ||
        lowerKey === 'mobile' ||
        lowerKey === 'number' ||
        lowerKey === 'contact' ||
        lowerKey === 'cell' ||
        lowerKey === 'phonenumber' ||
        lowerKey === 'tel' ||
        lowerKey === 'msisdn'
      ) {
        providedFields.phone = strVal;
      } else if (
        lowerKey === 'name' ||
        lowerKey === 'customername' ||
        lowerKey === 'fullname' ||
        lowerKey === 'username' ||
        lowerKey === 'nickname' ||
        lowerKey === 'nick' ||
        lowerKey === 'contactname' ||
        lowerKey === 'person' ||
        lowerKey === 'title'
      ) {
        if (!providedFields.name) {
          providedFields.name = strVal;
          providedCustomFields['customer_name'] = strVal;
          providedCustomFields['Customer Name'] = strVal;
        }
      } else if (
        lowerKey === 'canonicaladdress' ||
        lowerKey === 'address' ||
        lowerKey === 'fulladdress'
      ) {
        providedFields.address = strVal;
        providedCustomFields['canonical_address'] = strVal;
        providedCustomFields['Canonical Address'] = strVal;
      } else if (lowerKey === 'gender' || lowerKey === 'sex') {
        const gStr = strVal.toLowerCase();
        let g = 'Other';
        if (gStr.startsWith('m')) g = 'Male';
        else if (gStr.startsWith('f')) g = 'Female';
        providedFields.gender = g;
        providedCustomFields['gender'] = g;
        providedCustomFields['Gender'] = g;
      } else if (lowerKey === 'whatsappstatus' || lowerKey === 'whatsapp') {
        const cleanStatus = cleanArrayString(strVal) || strVal;
        providedCustomFields['whatsapp_status'] = cleanStatus;
        providedCustomFields['WhatsApp Status'] = cleanStatus;
      } else if (lowerKey === 'matchedordercount') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['matched_order_count'] = num;
          providedCustomFields['Matched Order Count'] = num;
          if (providedFields.orderCount === undefined) providedFields.orderCount = num;
        } else {
          providedCustomFields['matched_order_count'] = strVal;
        }
      } else if (lowerKey === 'lifetimeordercount' || lowerKey === 'ordercount' || lowerKey === 'totalorders') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedFields.orderCount = num;
          providedCustomFields['lifetime_order_count'] = num;
          providedCustomFields['Lifetime Order Count'] = num;
          providedCustomFields['Order Count'] = num;
        } else {
          providedCustomFields['lifetime_order_count'] = strVal;
        }
      } else if (lowerKey === 'matchednetorderamountbdt' || lowerKey === 'matchedorderamount') {
        const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          providedCustomFields['matched_net_order_amount_bdt'] = num;
          providedCustomFields['Matched Order Amount BDT'] = num;
          if (providedFields.orderAmount === undefined) providedFields.orderAmount = num;
        } else {
          providedCustomFields['matched_net_order_amount_bdt'] = strVal;
        }
      } else if (
        lowerKey === 'lifetimenetorderamountbdt' ||
        lowerKey === 'lifetimeorderamount' ||
        lowerKey === 'orderamount' ||
        lowerKey === 'amount' ||
        lowerKey === 'totalamount'
      ) {
        const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          providedFields.orderAmount = num;
          providedCustomFields['lifetime_net_order_amount_bdt'] = num;
          providedCustomFields['Lifetime Order Amount BDT'] = num;
          providedCustomFields['Order Amount'] = num;
        } else {
          providedCustomFields['lifetime_net_order_amount_bdt'] = strVal;
        }
      } else if (lowerKey === 'prepaidordercount' || lowerKey === 'prepaid') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['prepaid_order_count'] = num;
          providedCustomFields['Prepaid Order Count'] = num;
        } else {
          providedCustomFields['prepaid_order_count'] = strVal;
        }
      } else if (lowerKey === 'matcheduniquemerchantcount') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['matched_unique_merchant_count'] = num;
          providedCustomFields['Matched Unique Merchant Count'] = num;
        } else {
          providedCustomFields['matched_unique_merchant_count'] = strVal;
        }
      } else if (lowerKey === 'lifetimeuniquemerchantcount') {
        const num = parseInt(strVal.replace(/[^0-9.-]+/g, ''), 10);
        if (!isNaN(num)) {
          providedCustomFields['lifetime_unique_merchant_count'] = num;
          providedCustomFields['Lifetime Unique Merchant Count'] = num;
        } else {
          providedCustomFields['lifetime_unique_merchant_count'] = strVal;
        }
      } else if (lowerKey === 'primarymerchant' || lowerKey === 'merchant') {
        const cleanMerchant = cleanArrayString(strVal) || strVal;
        providedCustomFields['primary_merchant'] = cleanMerchant;
        providedCustomFields['Primary Merchant'] = cleanMerchant;
      } else if (lowerKey === 'matcheddistrictfilters' || lowerKey === 'district') {
        const cleanDistrict = cleanArrayString(strVal);
        providedCustomFields['matched_district_filters'] = cleanDistrict;
        providedCustomFields['Matched District'] = cleanDistrict;
        if (cleanDistrict && !providedFields.location) providedFields.location = cleanDistrict;
      } else if (lowerKey === 'matchedcityfilters' || lowerKey === 'city') {
        const cleanCity = cleanArrayString(strVal);
        providedCustomFields['matched_city_filters'] = cleanCity;
        providedCustomFields['Matched City'] = cleanCity;
        if (cleanCity && (!providedFields.location || providedFields.location === '[]')) providedFields.location = cleanCity;
      } else if (lowerKey === 'matchedareafilters' || lowerKey === 'area' || lowerKey === 'thana' || lowerKey === 'zone') {
        const cleanArea = cleanArrayString(strVal);
        providedCustomFields['matched_area_filters'] = cleanArea;
        providedCustomFields['Matched Area'] = cleanArea;
        if (cleanArea) providedFields.area = cleanArea;
      } else if (lowerKey === 'matchedblockroadfilters' || lowerKey === 'blockroad') {
        const cleanBlock = cleanArrayString(strVal);
        providedCustomFields['matched_block_road_filters'] = cleanBlock;
        providedCustomFields['Matched Block / Road'] = cleanBlock;
      } else if (lowerKey === 'inferredprimaryarea') {
        const cleanInferred = cleanArrayString(strVal);
        providedCustomFields['inferred_primary_area'] = cleanInferred;
        providedCustomFields['Inferred Primary Area'] = cleanInferred;
        if (cleanInferred && (!providedFields.area || providedFields.area === '[]')) providedFields.area = cleanInferred;
      } else if (lowerKey === 'lifetimefrequencysegment' || lowerKey === 'frequencysegment') {
        const cleanFreq = cleanArrayString(strVal) || strVal;
        providedCustomFields['lifetime_frequency_segment'] = cleanFreq;
        providedCustomFields['Frequency Segment'] = cleanFreq;
      } else if (lowerKey === 'lifetimevaluesegment' || lowerKey === 'valuesegment') {
        const cleanVal = cleanArrayString(strVal) || strVal;
        providedCustomFields['lifetime_value_segment'] = cleanVal;
        providedCustomFields['Value Segment'] = cleanVal;
      } else if (lowerKey === 'lifetimeprimarycategory' || lowerKey === 'primarycategory') {
        const cleanCat = cleanArrayString(strVal) || strVal;
        providedFields.category = cleanCat;
        providedCustomFields['lifetime_primary_category'] = cleanCat;
        providedCustomFields['Primary Category'] = cleanCat;
      } else if (lowerKey === 'email' || lowerKey === 'mail' || lowerKey === 'emailaddress') {
        providedFields.email = strVal;
      } else if (lowerKey === 'age' || lowerKey === 'years') {
        const num = parseInt(strVal, 10);
        if (!isNaN(num)) providedFields.age = num;
      } else if (
        lowerKey === 'avatartype' ||
        lowerKey === 'avatar' ||
        lowerKey === 'avatarurl' ||
        lowerKey === 'photo' ||
        lowerKey === 'image' ||
        lowerKey === 'picture' ||
        lowerKey === 'userphoto'
      ) {
        if (strVal.startsWith('http://') || strVal.startsWith('https://')) {
          providedFields.avatarUrl = strVal;
          providedFields.avatarOriginalUrl = strVal;
          providedFields.avatarType = 'With Avatar';
        } else if (strVal) {
          providedFields.avatarType = strVal;
        }
      } else if (lowerKey === 'activedays' || lowerKey === 'days' || lowerKey === 'active' || lowerKey === 'activeday') {
        const num = parseInt(strVal, 10);
        if (!isNaN(num)) providedFields.activeDays = num;
      } else if (
        lowerKey === 'lastonline' ||
        lowerKey === 'lastonlinetime' ||
        lowerKey === 'lastactive' ||
        lowerKey === 'online' ||
        lowerKey === 'date' ||
        lowerKey === 'timestamp'
      ) {
        const parsedDate = new Date(val);
        if (!isNaN(parsedDate.getTime())) providedFields.lastActive = parsedDate;
      } else if (lowerKey === 'location' || lowerKey === 'division' || lowerKey === 'state' || lowerKey === 'country') {
        providedFields.location = cleanArrayString(strVal) || strVal;
      } else if (lowerKey === 'status' || lowerKey === 'state') {
        providedFields.status = ['Active', 'Inactive', 'Pending', 'Suspended'].includes(strVal) ? strVal : 'Active';
      } else if (lowerKey === 'tag' || lowerKey === 'tags' || lowerKey === 'label' || lowerKey === 'labels' || lowerKey === 'badge') {
        strVal.split(',').forEach((t) => {
          const ct = cleanArrayString(t).trim();
          if (ct && !providedTags.includes(ct)) providedTags.push(ct);
        });
      } else if (lowerKey === 'category' || lowerKey === 'group' || lowerKey === 'segment') {
        providedFields.category = cleanArrayString(strVal) || strVal;
      } else {
        providedCustomFields[key] = val;
      }
    });
  }

  // Fallback single column phone detector if phone is not yet determined
  if (!providedFields.phone) {
    const values = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    for (const v of values) {
      const cleanStr = String(v).replace(/[\s\+\-\(\)]/g, '');
      if (cleanStr.length >= 7 && /^\d+$/.test(cleanStr)) {
        providedFields.phone = String(v).trim();
        break;
      }
    }
  }

  // If customCategory provided and category not set
  if (customCategory && customCategory.trim() && !providedFields.category) {
    providedFields.category = customCategory.trim();
  }

  // Format tags string into customFields for human-readable views
  if (providedTags.length > 0) {
    providedCustomFields['Tags / Labels'] = providedTags.join(', ');
  }

  return {
    phone: providedFields.phone || '',
    email: providedFields.email || '',
    providedFields,
    providedCustomFields,
    providedTags,
  };
}

/**
 * Computes partial updates for an existing matched database record.
 * Compares provided fields with matched record and produces only the modified fields.
 * Any unmapped or skipped or missing fields in incoming row are 100% PRESERVED in DB.
 */
export function computeRecordUpdates(
  incoming: ParsedRowData,
  matched: Record<string, any>
): RecordUpdateResult {
  const updateFields: Record<string, any> = {};
  const changedList: string[] = [];
  const diffs: DiffEntry[] = [];
  let hasChanges = false;

  const scalarFields = [
    'name',
    'email',
    'phone',
    'age',
    'gender',
    'location',
    'area',
    'address',
    'orderAmount',
    'orderCount',
    'status',
    'activeDays',
    'avatarType',
    'avatarUrl',
    'category',
  ];

  for (const field of scalarFields) {
    if (incoming.providedFields[field] !== undefined) {
      const newVal = incoming.providedFields[field];
      const oldVal = matched[field];

      // Update if different or if improving a generic placeholder like 'User (...)'
      const isPlaceholderName = field === 'name' && String(oldVal || '').startsWith('User (') && !String(newVal).startsWith('User (');

      if (newVal !== oldVal || isPlaceholderName) {
        updateFields[field] = newVal;
        hasChanges = true;

        if (field === 'avatarUrl' && newVal) {
          updateFields.avatarOriginalUrl = newVal;
          updateFields.avatarType = 'With Avatar';
        }

        const fieldTitle = field.charAt(0).toUpperCase() + field.slice(1);
        changedList.push(fieldTitle);
        diffs.push({
          field: fieldTitle,
          from: oldVal !== undefined && oldVal !== null && oldVal !== '' ? String(oldVal) : '(Empty)',
          to: String(newVal),
        });
      }
    }
  }

  // Check lastActive
  if (incoming.providedFields.lastActive) {
    const incomingDate = new Date(incoming.providedFields.lastActive);
    const existingDate = matched.lastActive ? new Date(matched.lastActive) : new Date(0);
    if (incomingDate > existingDate) {
      updateFields.lastActive = incomingDate;
      hasChanges = true;
      changedList.push('Last Online');
      diffs.push({
        field: 'Last Online',
        from: matched.lastActive ? new Date(matched.lastActive).toISOString().split('T')[0] : '(None)',
        to: incomingDate.toISOString().split('T')[0],
      });
    }
  }

  // Merge tags without duplicates
  if (incoming.providedTags && incoming.providedTags.length > 0) {
    const currentTags: string[] = Array.isArray(matched.tags) ? matched.tags : [];
    const newTagsToAdd = incoming.providedTags.filter((t) => !currentTags.includes(t));
    if (newTagsToAdd.length > 0) {
      const mergedTags = [...currentTags, ...newTagsToAdd];
      updateFields.tags = mergedTags;
      hasChanges = true;
      changedList.push(`Tag: ${newTagsToAdd.join(', ')}`);
      diffs.push({
        field: 'Tags / Labels',
        from: currentTags.length > 0 ? currentTags.join(', ') : '(None)',
        to: newTagsToAdd.join(', '),
      });
    }
  }

  // Merge customFields without erasing unmentioned keys
  const incomingCustomKeys = Object.keys(incoming.providedCustomFields || {});
  if (incomingCustomKeys.length > 0) {
    const existingCustom = matched.customFields || {};
    const mergedCustom = { ...existingCustom };
    let customChanged = false;

    for (const k of incomingCustomKeys) {
      const newVal = incoming.providedCustomFields[k];
      if (newVal !== undefined && newVal !== null && newVal !== '' && existingCustom[k] !== newVal) {
        mergedCustom[k] = newVal;
        customChanged = true;
      }
    }

    if (customChanged) {
      updateFields.customFields = mergedCustom;
      hasChanges = true;
      changedList.push('Custom Attributes');
    }
  }

  return {
    hasChanges,
    updateFields,
    changedList,
    diffs,
  };
}

/**
 * Constructs a new database document for records that do not exist yet.
 */
export function buildNewRecord(
  incoming: ParsedRowData,
  datasetId: string,
  fallbackIndex: number = 1
): Record<string, any> {
  const defaultName =
    incoming.providedFields.name ||
    (incoming.phone ? `User (${incoming.phone})` : `Record #${fallbackIndex}`);

  return {
    name: defaultName,
    phone: incoming.phone || '',
    email: incoming.providedFields.email || '',
    age: incoming.providedFields.age || 0,
    gender: incoming.providedFields.gender || 'Other',
    location: incoming.providedFields.location || '',
    area: incoming.providedFields.area || '',
    address: incoming.providedFields.address || '',
    orderAmount: incoming.providedFields.orderAmount || 0,
    orderCount: incoming.providedFields.orderCount || 0,
    status: incoming.providedFields.status || 'Active',
    activeDays: incoming.providedFields.activeDays || 0,
    avatarType:
      incoming.providedFields.avatarType ||
      (incoming.providedFields.avatarUrl ? 'With Avatar' : 'Without Avatar'),
    avatarUrl: incoming.providedFields.avatarUrl || '',
    avatarOriginalUrl:
      incoming.providedFields.avatarOriginalUrl || incoming.providedFields.avatarUrl || '',
    tags: [...incoming.providedTags],
    category: incoming.providedFields.category || '',
    lastActive: incoming.providedFields.lastActive || new Date(),
    customFields: { ...incoming.providedCustomFields },
    datasetId,
  };
}
