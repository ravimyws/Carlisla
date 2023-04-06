/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record', 'N/runtime'],
    /**
 * @param{query} query
 * @param{record} record
 */
    (query, record, runtime) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }



        const constants = {
            RECORDS: {
                INVOICE: {
                    FIELDS: {
                        CUSTOMER: 'entity',
                        SALES_ORDER_TYPE: 'custbody_ce_sales_order_type',
                        RELATED_INVOICE: 'custbody_ce_relate_inv',
                        CREATED_FROM: 'createdfrom',
                        BRAND: 'class'

                    }
                },
                VENDOR_BILL: {
                    FIELDS: {
                        VENDOR: 'entity',
                        RELATED_INVOICE: 'custbody_ce_relate_inv',

                    }


                },
                SALES_ORDER_TYPE: {
                    ID: 'CUSTOMRECORD_CE_ORDER_TYPE',
                    INSTANCE: {
                        REGULAR_ORDER: 'VAL_136628_6967245_SB1_262',
                        EARLY_ORDER: 'VAL_136629_6967245_SB1_581',
                        FIFTY_PERCENT: "VAL_136630_6967245_SB1_591"
                    }

                },
                CUSTOMER: {
                    FIELDS: {
                        STYLIST: 'custentity_iop_stylist'
                    }
                },
                VENDOR: {
                    FIELDS: {
                        STYLE_TYPE: 'custentity_ce_sty_type',
                        //AGENCY_PARENT: 'custentity_iop_agencyparent',
                        ACCOUNT_NUMBER: 'custentity_ce_stylist_acc_no',
                        COMMISSION_PERCENT: 'custentity_ce_std_comm',
                        PARTNER_SPLIT_PERCENT: 'custentity_ce_pn_split'
                    }
                },
                ACCOUNT_NUMBER_IOP: {
                    ID: 'customrecord_ce_stylist_acc_no',
                    FIELDS: {
                        ACCOUNT_COMMISSION: 'custrecord_ce_stylist_acc_no_acct_comm',

                    }
                }

            },

            CUSTOM_LISTS: {
                STYLIST_TYPE: {
                    ID: 'customlist_ce_sty_type',
                    VALUES: {
                        AGENCY: 'VAL_137887_6967245_SB1_544',
                        ASSOCIATES: 'VAL_137888_6967245_SB1_641'
                    }
                },
                COMMISSION_PERCENT: {
                    ID: 'customlist_ce_comm_pct',
                    VALUES: {
                        FIFTEEN: 'VAL_187523_6967245_SB1_503',
                        SEVENTINE: 'VAL_207443_6967245_SB1_581',
                        TWENTY: 'VAL_207444_6967245_SB1_360',
                        TWENTY_TWO: 'VAL_207445_6967245_SB1_141'
                    }
                }
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let savedVBS = [];
            try {
                log.error(scriptContext.type);
                
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.COPY) {
                    let transactionObj = scriptContext.newRecord;
                    let recordId = transactionObj.id;
                    transactionObj = getRecord(transactionObj.type, recordId);
                    let brand = transactionObj.getValue(constants.RECORDS.INVOICE.FIELDS.BRAND);
                    let createdFrom = transactionObj.getValue(constants.RECORDS.INVOICE.FIELDS.CREATED_FROM);

                    let so = getRecord(record.Type.SALES_ORDER, createdFrom);
                    let salesOrderType = so ? so.getValue(constants.RECORDS.INVOICE.FIELDS.SALES_ORDER_TYPE) : null;
                    let seasonIop = so ? so.getValue('custbody_ce_iop_season') : null;


                    if (salesOrderType) {
                        log.error(salesOrderType);

                        let customer = transactionObj.getValue(constants.RECORDS.INVOICE.FIELDS.CUSTOMER);

                        /* let customerRecord = record.load({
                            type: record.Type.CUSTOMER,
                            id: customer,
                            isDynamic: true
                        }); */

                        let vendor = transactionObj.getValue('custbody_ce_stylist');//customerRecord.getValue(constants.RECORDS.CUSTOMER.FIELDS.STYLIST);

                        let vendorRecord = getRecord(record.Type.VENDOR, vendor)

                        if (!vendorRecord) {
                            log.error("reason", "no vendor for customer");
                            return;
                        }


                        let vendorMappings = [
                            {
                                fieldId: constants.RECORDS.VENDOR.FIELDS.STYLE_TYPE,
                                key: 'styleType'
                            },
                            {
                                fieldId: constants.RECORDS.VENDOR.FIELDS.ACCOUNT_NUMBER,
                                key: 'accountNumberIOP'
                            },
                            {
                                fieldId: constants.RECORDS.VENDOR.FIELDS.COMMISSION_PERCENT,
                                key: 'commission'
                            },
                            {
                                fieldId: constants.RECORDS.VENDOR.FIELDS.PARTNER_SPLIT_PERCENT,
                                key: 'partnerSplit'
                            },

                        ];

                        let vendorDetails = vendorMappings.reduce((acc, def) => {
                            let value = vendorRecord.getValue(def.fieldId);
                            if (def.fieldId === constants.RECORDS.VENDOR.FIELDS.COMMISSION_PERCENT || def.fieldId === constants.RECORDS.VENDOR.FIELDS.PARTNER_SPLIT_PERCENT) {
                                let text = vendorRecord.getText(def.fieldId);
                                let nv = text ? text.trim().split('%')[0] / 100 : 0;
                                acc[def.key] = nv;
                            } else {
                                acc[def.key] = value
                            }
                            return acc;
                        }, {});

                        if (!vendorDetails.styleType) {
                            log.error("reason", 'vendor no style type');
                            return;
                        }

                        let vendorIOPAgencyOwner = null;
                        let vendorIOPCommission = null;

                        if (vendorDetails.accountNumberIOP) {
                            vendorAccountIOPRecord = record.load({
                                type: constants.RECORDS.ACCOUNT_NUMBER_IOP.ID,// 'customrecord_ce_stylist_acc_no',
                                id: vendorDetails.accountNumberIOP,
                                isDynamic: true
                            });
                            let commissionIOPText = vendorAccountIOPRecord.getText({ fieldId: constants.RECORDS.ACCOUNT_NUMBER_IOP.FIELDS.ACCOUNT_COMMISSION });
                            if (commissionIOPText && commissionIOPText.indexOf('%') > 1) {
                                vendorIOPCommission = commissionIOPText.trim().split('%')[0] / 100;
                            } else {
                                log.error("reason", 'something wrong with IOP record commission');
                                return;
                            }

                            vendorIOPAgencyOwner = vendorAccountIOPRecord.getValue('custrecord_ce_stylist_acc_no_acct_owner');
                        } else {
                            log.error("reason", 'no vendor IOP record');
                            return;
                        }

                        log.error('vendorDetails', vendorDetails);
                        log.error('vendorParentDetails', vendorIOPCommission);

                        let styleTypeObj = getVendorStyleType(vendorDetails.styleType)[0];


                        let isAgency = styleTypeObj?.scriptid === constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.AGENCY;
                        let isAssociate = styleTypeObj?.scriptid === constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.ASSOCIATES;

                        log.error('isA', { isAgency, isAssociate, 'styleTpeObj?.scriptid === constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.AGENCY': styleTypeObj?.scriptid === constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.AGENCY });

                        let partnerSplit = vendorDetails.partnerSplit;


                        let partnerSplit50Percent = partnerSplit == 0.5;

                        let partnerSplit100percent = partnerSplit == 1;

                        let associateCommission = vendorDetails.commission;
                        let vendorIOPCommissionObj = vendorIOPCommission;


                        let commisonedTypes = getCommisonedSalesOrderTypes();
                        let commisonedTypeScriptIdMap = mapRecordsByKey(commisonedTypes, 'scriptid');
                        let commisonedTypeIdMap = mapRecordsByKey(commisonedTypes, 'id');

                        let salesOrderTypeObj = commisonedTypeIdMap[salesOrderType];
                        let salesOrderCommission = salesOrderTypeObj.commission;

                        log.error('styleTpeObj', { styleTpeObj: styleTypeObj, salesOrderTypeObj, commisonedTypes, commisonedTypeIdMap, commisonedTypeScriptIdMap });

                        let salesOrderTypeScriptId = salesOrderTypeObj?.scriptid;

                        let primaryCommission = null;

                        let notValidStylist = false;

                        /* let isAgencyRegularOrder = false;
                        let isAgencyEarlyOrder = false;
                        let isAgency50PercentOrder = false;

                        let isAssociateRegularOrder = false;
                        let isAssociateEarlyOrder = false;
                        let isAssociate50PercentOrder = false; */
                        let partnersData = { fiftyPercentPartner: null, hundredPercentPartner: null, isFifty: false, isHunderd: false, partners: [], size: 0, noPartner: true };

                        if (isAgency) {
                            log.error('constants.RECORDS.SALES_ORDER_TYPE.INSTANCE.REGULAR_ORDER', vendorIOPCommission);
                            primaryCommission = salesOrderCommission || vendorIOPCommissionObj;
                            log.error('ro pc', primaryCommission);
                            let d = getAssociateAccountPartner(vendorDetails.accountNumberIOP, vendor, constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.AGENCY);
                            partnersData = getAssociatePartnerByArray(d);
                            log.error('partnersData', partnersData);
                            if ((!primaryCommission)) {
                                log.error("reason", `Agency regular order and  primaryCommission NOT EXIST, so no VB`);
                                return;
                            }



                        } else if (isAssociate) {

                            let d = getAssociateAccountPartner(vendorDetails.accountNumberIOP, vendor, constants.CUSTOM_LISTS.STYLIST_TYPE.VALUES.AGENCY);
                            partnersData = getAssociatePartnerByArray(d);
                            log.error('partnersData', partnersData);

                            // if (salesOrderTypeScriptId === constants.RECORDS.SALES_ORDER_TYPE.INSTANCE.REGULAR_ORDER) {
                            // isAssociateRegularOrder = true;
                            primaryCommission = salesOrderCommission || vendorIOPCommissionObj;
                            log.error('ro pc', primaryCommission);
                            if ((!primaryCommission)) {
                                log.error("reason", ` Associate primaryCommission NOT EXIST, so no VB`);
                                return;
                            }
                            if ((associateCommission > primaryCommission)) {
                                // if (partnersData.noPartner) {
                                    log.error("reason", `stylistCommission not exist or stylistCommission > IOP commission  , so no VB`);
                                    return;
                                // }
                            }
                            // } 

                        } else {
                            /* log.error('not a valid stylist');
                            notValidStylist = true; */

                            primaryCommission = salesOrderCommission || vendorIOPCommissionObj;
                            log.error('ro pc', primaryCommission);
                            if ((!primaryCommission)) {
                                log.error("reason", `Agency regular order and  primaryCommission NOT EXIST, so no VB`);
                                return;
                            }
                        }

                        /* if (notValidStylist) {
                            log.error("reason", `Not Valid Stylist, so no VB`);
                            return;
                        } else if (!primaryCommission) {
                            log.error("reason", `No  Primary Commission, so no VB`);
                            return;
                        } */

                        if (isAgency) {
                            let partner = vendor;

                            
                            log.error('isAgency', {partnersData, salesOrderCommission, vendor, vendorIOPAgencyOwner, primaryCommission });
                            if (vendor === vendorIOPAgencyOwner) {
                                if (partnersData.isFifty) {  
                                    if (vendorIOPAgencyOwner === null) {
                                        log.error("reason", `No Account AgencyOwner`);
                                        return;
                                    }                              
                                    let primaryCommissionSplit = primaryCommission * partnerSplit;
                                    let vbid = createVB(transactionObj.id, primaryCommissionSplit, partnersData.fiftyPercentPartner.id, brand,seasonIop);
                                    let vbid2 = createVB(transactionObj.id, primaryCommissionSplit, vendorIOPAgencyOwner, brand,seasonIop);
                                    savedVBS.push(vbid);
                                    savedVBS.push(vbid2);
                                    
                                }else{
                                    let vbid = createVB(transactionObj.id, primaryCommission, partner, brand,seasonIop);
                                    savedVBS.push(vbid);
                                }

                            } else {

                                if (partnerSplit100percent) {
                                    //agenceyRegularorderVB(invoiceRecord.id, primaryCommission, partner);
                                    let vbid = createVB(transactionObj.id, primaryCommission, partner, brand,seasonIop);
                                    savedVBS.push(vbid);
                                } else if (partnerSplit50Percent) {
                                    if (vendorIOPAgencyOwner === null) {
                                        log.error("reason", `No Account AgencyOwner`);
                                        return;
                                    }
                                    let primaryCommissionSplit = primaryCommission * partnerSplit;
                                    let vbid = createVB(transactionObj.id, primaryCommissionSplit, partner, brand,seasonIop);
                                    let vbid2 = createVB(transactionObj.id, primaryCommissionSplit, vendorIOPAgencyOwner, brand,seasonIop);
                                    savedVBS.push(vbid);
                                    savedVBS.push(vbid2);
                                } else {
                                    log.error("reason", `No Partner Spilt for Agency`);
                                    /* let agencyOwner = getAgencyOwner(query, vendorDetails, vendor);
                                    agenceyRegularorderVB(invoiceRecord.id, primaryCommission, agencyOwner); */
                                }
                            }

                        } else if (isAssociate) {
                            let associate = vendor;
                            log.error('Associate commission info :salesOrderCommission,associateCommission,vendorIOPAgencyOwner,primaryCommission', {partnersData, salesOrderCommission, associateCommission, vendorIOPAgencyOwner, primaryCommission });
                            
                            if(!associateCommission){
                                
                                let vbid = createVB(transactionObj.id, primaryCommission, vendorIOPAgencyOwner, brand,seasonIop);
                                savedVBS.push(vbid);
                                
                            }
                            else if (associateCommission === primaryCommission) {
                                let vbid = createVB(transactionObj.id, associateCommission, associate, brand,seasonIop);
                                savedVBS.push(vbid);
                            } else if (associateCommission < primaryCommission) {
                                log.error('associateCommission < primaryCommission');
                                //let associateOwner = getAssociateOwner(vendorDetails, vendor, brand);
                                if (partnersData.isFifty) {
                                    if (vendorIOPAgencyOwner === null) {
                                        log.error("reason", `No Account AgencyOwner`);
                                        return;
                                    }
                                    let vbid = createVB(transactionObj.id, associateCommission, associate,brand,seasonIop);
                                    savedVBS.push(vbid);
                                    if (vendorIOPAgencyOwner == partnersData.fiftyPercentPartner.id) {
                                        let vbid2 = createVB(transactionObj.id, (primaryCommission - associateCommission), vendorIOPAgencyOwner, brand,seasonIop);
                                        savedVBS.push(vbid2);
                                    } else {


                                        let vbid2 = createVB(transactionObj.id, (primaryCommission - associateCommission) * 0.5, vendorIOPAgencyOwner, brand,seasonIop);
                                        let vbid3 = createVB(transactionObj.id, (primaryCommission - associateCommission) * 0.5, partnersData.fiftyPercentPartner.id, brand,seasonIop);

                                        savedVBS.push(vbid2);
                                        savedVBS.push(vbid3);
                                    }
                                }else{
                                    if (vendorIOPAgencyOwner === null) {
                                        log.error("reason", `No Account AgencyOwner`);
                                        return;
                                    }
                                    let vbid = createVB(transactionObj.id, associateCommission, associate, brand,seasonIop);
                                    //createVB(transactionObj.id, primaryCommission - associateCommission, associateOwner, brand);
                                    let vbid2 = createVB(transactionObj.id, primaryCommission - associateCommission, vendorIOPAgencyOwner, brand,seasonIop);
                                    savedVBS.push(vbid);
                                    savedVBS.push(vbid2);
                                }

                            }

                        } else {
                            log.error('reason', 'Stylist is not associate or agency');
                        }

                        if (savedVBS.length > 0) {
                            transactionObj.setValue({
                                fieldId: 'custbody_ce_inv_comm_vb',
                                value: savedVBS
                            });
                            let tranid = transactionObj.save();
                            log.error('tranid', { tranid, savedVBS })
                        }

                    } else {
                        log.error('reason', 'No sales order type');
                    }

                }
            } catch (e) {
                log.error('error while Cash Sale', e);
                deletedAlreadyCreatedVBSIfError(savedVBS)
            }

        }

        function deletedAlreadyCreatedVBSIfError(savedVBS) {
            try {
                if (savedVBS.length > 0) {
                    savedVBS.forEach((id) => {
                        record.delete({
                            type: record.Type.VENDOR_BILL,
                            id: id
                        })
                    });
                }
            } catch (e) {
                log.error('error while deleting VBS', e);
            }
        }

        function getItemFromParameter() {
            let scriptObj = runtime.getCurrentScript();

            let item = scriptObj.getParameter({ name: 'custscript_cl_ue_invoice_item' });
            return item;
        }

        function getVbFormParameter() {
            let scriptObj = runtime.getCurrentScript();

            let vbFormText = scriptObj.getParameter({ name: 'custscript_cl_ue_invoice_vb_form' });
            return vbFormText || 'Commission Vendor Bill';
        }

        function getAmountByAccountType(invoiceId) {
            let sql = `SELECT sum(amount) totalamount,accounttype, BUILTIN_RESULT.TYPE_BOOLEAN(taxline) as taxline FROM (
                SELECT 
                 
                 abs(tl.foreignamount) amount,
                 tl.accountinglinetype accounttype,
                 tl.taxline
                 
              FROM 
                "TRANSACTION" t, 
                transactionLine tl
              WHERE 
                t."ID" = tl."TRANSACTION"
                 AND (
                    (t."ID" = ? 
                 AND NVL(tl.mainline, 'F') = ? 
                 AND (NVL(tl.taxline, 'T') = ? 
                 OR tl.accountinglinetype IN ('INCOME','DISCOUNT'))
                 ))
                 ) group by accounttype, taxline`;


            let rs = query.runSuiteQL({
                query: sql,
                params: [invoiceId, false, true]
            });

            return rs.asMappedResults();
        }

        function createVB(tranId, primaryCommission, vendorId, brand,seasonIop) {
            log.error('createVB');
            let data = getAmountByAccountType(tranId);
            log.error('getAmountByAccountType', data);
            let discountLineObj = data.filter((e) => { return e.accounttype === "DISCOUNT" })[0];
            let incomeLineObj = data.filter((e) => { return e.accounttype === "INCOME" })[0];
            let taxlineLineObj = data.filter((e) => { return e.taxline })[0];
            log.error('getAmountByAccountType', { data, incomeLineObj, discountLineObj, primaryCommission });
            let venderBillAmount = incomeLineObj.totalamount * primaryCommission - (discountLineObj?.totalamount || 0);// - (taxlineLineObj?.totalamount || 0);
            let item = getItemFromParameter();
            let quantity = 1;

            let bodyFields = {};
            bodyFields[constants.RECORDS.VENDOR_BILL.FIELDS.VENDOR] = vendorId;
            bodyFields[constants.RECORDS.VENDOR_BILL.FIELDS.RELATED_INVOICE] = tranId;
            bodyFields['class'] = brand;
            if(seasonIop){
                bodyFields['custbody_ce_iop_season'] = seasonIop;
            }

            let line = {};
            line['item'] = item;
            line['quantity'] = quantity;
            line['amount'] = venderBillAmount;
            line['rate'] = venderBillAmount;

            let vbdata = { body: bodyFields, lines: [line] };
            log.error('vbdata', vbdata);
            let vb = record.create({
                type: record.Type.VENDOR_BILL,
                isDynamic: true
            });

            let custForm = vb.getField('customform');

            if (custForm) {
                let vbFormText = getVbFormParameter();
                let options = custForm.getSelectOptions({
                    filter: vbFormText,
                    operator: 'is'
                });

                if (options.length > 0) {
                    vb.setValue('customform', options[0].value);
                }
            }

            Object.keys(vbdata.body).forEach((fieldId) => {
                let value = vbdata.body[fieldId];
                vb.setValue({
                    fieldId, value
                });
            });

            vbdata.lines.forEach((line) => {
                vb.selectNewLine({
                    sublistId: 'item'
                });
                Object.keys(line).forEach((fieldId) => {
                    let value = line[fieldId];
                    vb.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId, value
                    });
                });

                vb.commitLine({
                    sublistId: 'item'
                });
            });

            return vb.save();


        }

        function getCommisonedSalesOrderTypes() {
            let sql = `SELECT 
                        BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_CE_ORDER_TYPE.name) AS name /*{name#RAW}*/, 
                        BUILTIN_RESULT.TYPE_PERCENT(CUSTOMRECORD_CE_ORDER_TYPE.custrecord_ce_order_type_comm) AS commisiontext /*{custrecord_ce_order_type_comm#RAW}*/, 
                        CUSTOMRECORD_CE_ORDER_TYPE.custrecord_ce_order_type_comm AS commission,
                        BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_CE_ORDER_TYPE."ID") AS "ID" /*{id#RAW}*/, 
                        BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_CE_ORDER_TYPE.scriptid) AS scriptid /*{scriptid#RAW}*/
                    FROM 
                    CUSTOMRECORD_CE_ORDER_TYPE
                    WHERE 
                    CUSTOMRECORD_CE_ORDER_TYPE.custrecord_ce_order_type_cmsa = ? `;

            let rs = query.runSuiteQL({
                query: sql,
                params: [true]
            });
            return rs.asMappedResults()
        }

        function getVendorStyleType(styleType) {

            let sql = `SELECT recordid,scriptid,name FROM customlist_ce_sty_type WHERE recordid=?`

            let rs = query.runSuiteQL({
                query: sql,
                params: [styleType]
            });
            return rs.asMappedResults()
        }

        function mapRecordsByKey(data, key = 'id') {

            return data.reduce((acc, cur) => {
                acc[cur[key]] = cur;
                return acc;
            }, {});

        }

        function getRecord(type, id, isthrow) {
            let rec = null;
            try {
                rec = record.load({
                    type, id, isDynamic: true
                });
            } catch (e) {
                log.debug(`Error while loading record type :${type} with id: ${id}`, e);
                if (isthrow) {
                    throw e;
                }

            }
            return rec;
        }

        function getAssociateAccountPartner(vendorAccountIOP, vendor, agencyScriptId) {
            let rs = query.runSuiteQL({
                query: `SELECT v.id,TO_NUMBER(Trim(TRAILING '%' FROM BUILTIN.DF(v.custentity_ce_pn_split)))/100 as  partnersplit 
                                FROM vendor v INNER JOIN customlist_ce_sty_type sy ON v.custentity_ce_sty_type  = sy.recordid
                                where v.custentity_ce_stylist_acc_no =${vendorAccountIOP} 
                                and v.id <> ${vendor} 
                                and v.custentity_ce_pn_split is not null
                                and sy.scriptid IN ('${agencyScriptId}')
                                and v.isinactive = 'F' order by partnersplit`
            });

            let associatePartnerData = rs.asMappedResults();
            log.error('associatePartnerData', associatePartnerData);
            return associatePartnerData;
        }

        function AssociatePartnerValidator(data, message) {
            /* if(data.length === 0){
                throw "no partner";
            } */
            if (data.length > 2) {
                throw message || 'partners for the AccountIOP is more than 2'
            }

            if (data.length === 2) {
                let [v1, v2] = data;
                if ((v1.partnersplit === v2.partnersplit)) {
                    throw "Associate partners split is same"
                }
            }
        }

        function getAssociatePartnerByArray(data) {
            AssociatePartnerValidator(data);

            let fiftyPercentPartner = data.filter((e) => e.partnersplit === 0.5)[0];
            let hundredPercentPartner = data.filter((e) => e.partnersplit === 1)[0];
            return {
                fiftyPercentPartner, hundredPercentPartner, isFifty: !!fiftyPercentPartner, isHunderd: !!hundredPercentPartner, partners: data, size: data.length, noPartner: data.length === 0
            };
        }

        function getAgencyOwner(vendorDetails, vendor) {
            let rs = query.runSuiteQL({
                query: `SELECT id FROM vendor 
                            where custentity_ce_stylist_acc_no =${vendorDetails.accountNumberIOP} 
                            and id <> ${vendor} 
                            and custentity_ce_pn_split is null
                            and isinactive = 'F'`
            });

            let agencyOwnerData = rs.asMappedResults();
            if (agencyOwnerData.length > 1) {
                throw 'multiple agency owner exist';
            } else if (agencyOwnerData.length == 0) {
                throw 'no agency owner exist';
            }

            let agencyOwner = agencyOwnerData[0].id;
            return agencyOwner;
        }

        function getAssociateOwner(vendorDetails, vendor) {
            let rs = query.runSuiteQL({
                query: `SELECT id FROM vendor 
                            where custentity_ce_stylist_acc_no =${vendorDetails.accountNumberIOP} 
                            and id <> ${vendor} 
                            and custentity_ce_std_comm is null
                            and isinactive = 'F'`
            });

            let associateOwnerData = rs.asMappedResults();
            if (associateOwnerData.length > 1) {
                throw 'multiple agency owner exist';
            } else if (associateOwnerData.length == 0) {
                throw 'no agency owner exist';
            }

            let associateOwner = associateOwnerData[0].id;
            return associateOwner;
        }

        return {/* beforeLoad, beforeSubmit, */ afterSubmit }

    });



