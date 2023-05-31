/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * Name: MD CE UE Generate Cash Sale On Item Fulfillment
 * Version: 1
 *
 * Lafira Solutions Ltd.
 * Author: Timothy Wong
 * Date: 2022-03-07
 *
 * Script:
 * Deploy:
 *
 * @module
 * @description
 *
 * Changelog
 * -- Version 1.0 - Timothy Wong || 2022-03-07
    --- Initial Code release
 *
 *
 */

define(['N/record','N/runtime','N/render','N/email','N/search'], function(record,runtime,render,email,search) {


    const CASHSALE_FORM_ID = 114;
    const BRAND_EMAIL = {
        "Carlisle":111696,
        "Etcetera":111697
    };


    // const CASHSALE_FORM_ID = 112;//95;
    // const BRAND_EMAIL = {
    //     "Carlisle":70879,
    //     "Etcetera":70880
    // };
    
    
    /**
       * @function afterSubmit
       * @description description
       *
       * @public
       * @param  {type} context.newRecord
       * @param  {type} context.oldRecord
       * @param  {type} context.type
       */
    var itemObj = {};
    function afterSubmit(context) {
        try{
    
            var startTime = new Date().getTime();
            var recId = context.newRecord.id;
    
            var ifRec = record.load({
                    type: "itemfulfillment",
                    id: recId,
                    isDynamic: true,
                });
    
            var soId = ifRec.getValue("createdfrom");
    
            var csRec = record.transform({
                    fromType: "salesorder",
                    fromId: soId,
                    toType: "cashsale",
                    isDynamic: true,
                });
    
            var ifLineCount = ifRec.getLineCount({
                    sublistId: "item"
                });
    
            for(var ifLine = 0; ifLine<ifLineCount;ifLine++){
                ifRec.selectLine({
                        sublistId: "item",
                        line: ifLine
                    });
                var itemId = ifRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item"
                    });
    
                var itemQty = ifRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "quantity"
                    });
    
                itemObj[itemId] = itemQty;
    
            }
    
            var csLineCount = csRec.getLineCount({
                    sublistId: "item"
                });
    
            var counter1=0;
            for(var csLine=0;csLine<csLineCount;csLine++){
    
                csRec.selectLine({
                        sublistId: "item",
                        line: counter1
                    });
    
                var itemId = csRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item"
                    });
    
                if (itemObj.hasOwnProperty(itemId)) {
                    csRec.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "quantity",
                            value: itemObj[itemId],
                        });
                    csRec.commitLine({
                            sublistId: "item",
                        });
    
                    counter1++;
                }else{
    
                    csRec.removeLine({
                            sublistId: "item",
                            line: counter1,
                        });
                }
    
    
            }
    
            var customerId = csRec.getValue("entity");
    
            var csId = csRec.save();
    
    
            record.submitFields({
                    type: "itemfulfillment",
                    id: recId,
                    values: {custbody_ce_iop_ifcs_link:csId},
                });
    
            
            var pdfFile = render.transaction({
                    entityId: csId,
                    printMode: render.PrintMode.PDF,
                    formId: CASHSALE_FORM_ID,
                });
            
            var customerLookup = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: customerId,
                    columns: ["email","custentity_ce_sty_email"]
                });
            
            var customerEmail = customerLookup.email;
            var stylistEmail = customerLookup.custentity_ce_sty_email;
            
            
            var body = `Your invoice is here. 
            
                We hope you enjoyed your purchase. `;

            var brand = csRec.getText("class");
    
                
            email.send({
                    author: BRAND_EMAIL[brand],
                    body: body,
                    recipients: customerEmail,
                    subject: `Your ${brand} Invoice`,
                    attachments: [pdfFile],
                    cc: [stylistEmail],
                    isInternalOnly: false,
                    relatedRecords: {
                        "transactionId":csId
                    },
                });

            var trandate = ifRec.getValue("trandate");
    
    
            var lineCount = ifRec.getLineCount({
                    sublistId: "item"
                });
        
            var itemArr = [];
        
        
            for(var line=0;line<lineCount;line++){
                ifRec.selectLine({
                        sublistId: "item",
                        line: line
                    });
        
                var itemId = ifRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item"
                    });
        
                itemArr.push(itemId);
        
            }
        
            var createdFrom = ifRec.getValue("createdfrom");
        
            var soRec = record.load({
                    type: "salesorder",
                    id: createdFrom,
                    isDynamic: true
                });
        
            soRec.setValue("custbody_iop_lastshipdate",trandate);
            var soLineCount = soRec.getLineCount({
                    sublistId: "item"
                });
        
        
            for(var soLine=0;soLine<soLineCount;soLine++){
                soRec.selectLine({
                        sublistId: "item",
                        line: soLine
                    });
        
                var itemId = soRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item"
                    });
                for(var i=0;i<itemArr.length;i++){
                    if (itemArr[i]==itemId) {
                        soRec.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_iop_lastshipdate",
                                value: trandate,
                            });
                        soRec.commitLine({
                                sublistId: "item",
                            });
                        break;
                    }
                }
            }

            soRec.save();
    
    
        } catch (e) {
            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
            var scriptId = runtime.getCurrentScript().id;
            var endTime = new Date().getTime();
            log.error("fn:afterSubmit:Error: "+ context.newRecord.type +":"+context.newRecord.id, JSON.stringify({"Error": {type: e.type,name: e.name,message: e.message,stack: e.stack,cause: JSON.stringify(e.cause),id: e.id}, "UserEventType": context.type, "ExecutionContext": runtime.executionContext, "Stats": { "Start Time": startTime, "End Time": endTime, "Time Difference (ms)": endTime - startTime, "remainingUsage:": remainingUsage }}));
        }
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
        log.debug('afterSubmit', 'remainingUsage: ' + remainingUsage);
        return true;
    }
    
    return {
        afterSubmit:afterSubmit
    };
});