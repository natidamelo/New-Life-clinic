import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { useAuth } from '../../context/AuthContext'; // Assuming AuthContext provides doctor details
import { Patient } from '../../services/patientService'; // Use the correct Patient type
import { format } from 'date-fns';
import { Printer, Package, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import inventoryService, { InventoryItem } from '../../services/inventoryService';
import serviceService from '../../services/serviceService';
import serviceRequestService from '../../services/serviceRequestService';
import api from '../../services/apiService';
import type { Service } from '../../types/service';
// PrescriptionExtensionModal import removed - simplified prescription system

// Add logo path constants
const LOGO_PATH = '/assets/images/logo.jpg';
const LOGO_FALLBACK = '/assets/images/logo-placeholder.svg';

// Most subscribed medications (most commonly prescribed)
const MOST_SUBSCRIBED_MEDICATIONS = [
    "Paracetamol 500mg",
    "Amoxicillin 500mg", 
    "Ibuprofen 400mg",
    "Azithromycin 500mg",
    "Paracetamol Syrup 250mg/5ml",
    "Amoxicillin Syrup 250mg/5ml",
    "Cough Syrup",
    "Exedeve Syrup",
    "Metformin 500mg",
    "Amlodipine 5mg",
    "Atorvastatin 20mg",
    "Omeprazole 20mg",
    "Lisinopril 10mg",
    "Hydrochlorothiazide 25mg",
    "Tramadol 50mg",
    "Diclofenac 50mg",
    "Ciprofloxacin 500mg",
    "Cephalexin 500mg",
    "Doxycycline 100mg"
];

// Common medications list
const COMMON_MEDICATIONS = [
    // 🩹 ANTIBIOTICS & ANTI-INFECTIVES
    "Amoxicillin 250mg",
    "Amoxicillin 500mg",
    "Amoxicillin/Clavulanate 625mg",
    "Azithromycin 250mg",
    "Azithromycin 500mg",
    "Ciprofloxacin 250mg",
    "Ciprofloxacin 500mg",
    "Clindamycin 150mg",
    "Clindamycin 300mg",
    "Doxycycline 100mg",
    "Erythromycin 250mg",
    "Metronidazole 400mg",
    "Metronidazole 500mg",
    "Cephalexin 250mg",
    "Cephalexin 500mg",
    "Trimethoprim/Sulfamethoxazole 480mg",
    "Nitrofurantoin 50mg",
    "Nitrofurantoin 100mg",
    "Norfloxacin 400mg",
    
    // 🩸 SYRUPS & LIQUID MEDICATIONS
    "Paracetamol Syrup 120mg/5ml",
    "Paracetamol Syrup 250mg/5ml", 
    "Ibuprofen Syrup 100mg/5ml",
    "Amoxicillin Syrup 125mg/5ml",
    "Amoxicillin Syrup 250mg/5ml",
    "Erythromycin Syrup 125mg/5ml",
    "Azithromycin Syrup 200mg/5ml",
    "Cetirizine Syrup 5mg/5ml",
    "Loratadine Syrup 5mg/5ml",
    "Salbutamol Syrup 2mg/5ml",
    "Codeine Cough Syrup 15mg/5ml",
    "Dextromethorphan Syrup 15mg/5ml",
    "Expectorant Syrup 100mg/5ml",
    "Iron Syrup 50mg/5ml",
    "Multivitamin Syrup",
    "Antacid Syrup 10ml",
    "Domperidone Syrup 5mg/5ml",
    "Lactulose Syrup 10g/15ml",
    "ORS Solution",
    "Zinc Syrup 10mg/5ml",
    "Exedeve Syrup",
    "Exedeve",
    "Cough Syrup",
    "Antibiotic Syrup",
    "Pain Relief Syrup",
    "Fever Syrup",
    "Allergy Syrup",
    "Cefixime Syrup 100mg/5ml",
    "Cefixime Syrup",
    "Clarithromycin Syrup 125mg/5ml",
    "Clarithromycin Syrup",
    "Prednisolone Syrup 5mg/5ml",
    "Prednisolone Syrup",
    "Vitamin D Syrup",
    "Calcium Syrup",
    "Probiotic Syrup",

    // 🩹 PAIN & INFLAMMATION
    "Paracetamol 500mg",
    "Paracetamol 1000mg",
    "Ibuprofen 200mg",
    "Ibuprofen 400mg",
    "Diclofenac 50mg",
    "Diclofenac 75mg",
    "Aspirin 75mg",
    "Aspirin 300mg",
    "Naproxen 250mg",
    "Naproxen 500mg",
    "Mefenamic Acid 250mg",
    "Tramadol 50mg",
    "Tramadol 100mg",
    "Anti-Pain Suppository 100mg",
    "Other Suppository",

    // 🫀 CARDIOVASCULAR
    "Amlodipine 5mg",
    "Amlodipine 10mg",
    "Atenolol 50mg",
    "Atenolol 100mg",
    "Atorvastatin 10mg",
    "Atorvastatin 20mg",
    "Simvastatin 10mg",
    "Simvastatin 20mg",
    "Losartan 50mg",
    "Losartan 100mg",
    "Enalapril 5mg",
    "Enalapril 10mg",
    "Hydrochlorothiazide 25mg",
    "Metoprolol 50mg",
    "Metoprolol 100mg",
    "Lisinopril 10mg",
    "Lisinopril 20mg",
    "Propranolol 40mg",
    "Nifedipine 10mg",

    // 🍯 DIGESTIVE & GI
    "Omeprazole 20mg",
    "Omeprazole 40mg",
    "Esomeprazole 20mg",
    "Esomeprazole 40mg",
    "Ranitidine 150mg",
    "Ranitidine 300mg",
    "Famotidine 20mg",
    "Famotidine 40mg",
    "Domperidone 10mg",
    "Metoclopramide 10mg",
    "Loperamide 2mg",
    "Mebeverine 135mg",
    "Hyoscine Butylbromide 10mg",
    "Simethicone 40mg",
    "Lactulose 10g/15ml",
    "Bisacodyl 5mg",
    "Sennosides 8.6mg",

    // 🩸 DIABETES & ENDOCRINE
    "Metformin 500mg",
    "Metformin 850mg",
    "Glimepiride 1mg",
    "Glimepiride 2mg",
    "Gliclazide 80mg",
    "Glipizide 5mg",
    "Levothyroxine 25mcg",
    "Levothyroxine 50mcg",
    "Levothyroxine 100mcg",

    // 🫁 RESPIRATORY
    "Salbutamol 2mg",
    "Salbutamol 4mg",
    "Montelukast 4mg",
    "Montelukast 5mg", 
    "Montelukast 10mg",
    "Theophylline 200mg",
    "Prednisolone 5mg",
    "Prednisolone 10mg",
    "Budesonide 3mg",
    "Cetirizine 10mg",
    "Loratadine 10mg",
    "Fexofenadine 120mg",
    "Fexofenadine 180mg",
    "Chlorpheniramine 4mg",

    // 🧠 NEUROLOGICAL & MENTAL HEALTH
    "Amitriptyline 10mg",
    "Amitriptyline 25mg",
    "Fluoxetine 20mg",
    "Sertraline 50mg",
    "Sertraline 100mg",
    "Escitalopram 10mg",
    "Escitalopram 20mg",
    "Diazepam 2mg",
    "Diazepam 5mg",
    "Lorazepam 1mg",
    "Lorazepam 2mg",
    "Clonazepam 0.5mg",
    "Clonazepam 2mg",
    "Gabapentin 100mg",
    "Gabapentin 300mg",
    "Pregabalin 75mg",
    "Pregabalin 150mg",
    "Carbamazepine 200mg",
    "Phenytoin 100mg",
    "Valproate 200mg",

    // 🦴 MUSCULOSKELETAL 
    "Calcium Carbonate 500mg",
    "Calcium + Vitamin D3",
    "Vitamin D3 1000IU",
    "Vitamin D3 5000IU",
    "Iron 65mg",
    "Iron + Folic Acid",
    "Folic Acid 5mg",
    "Vitamin B12 1000mcg",
    "Vitamin B Complex",
    "Multivitamin Tablets",
    "Zinc 10mg",
    "Magnesium 200mg",

    // 🦠 ANTIFUNGALS
    "Fluconazole 150mg",
    "Fluconazole 200mg",
    "Itraconazole 100mg",
    "Ketoconazole 200mg",
    "Terbinafine 250mg",
    "Griseofulvin 250mg",
    "Nystatin 500000IU",
    "Miconazole 2% Oral Gel",

    // 🩺 TOPICAL MEDICATIONS - OINTMENTS & CREAMS
    "Hydrocortisone Cream 1%",
    "Betamethasone Cream 0.1%",
    "Clobetasol Ointment 0.05%",
    "Mometasone Cream 0.1%",
    "Triamcinolone Cream 0.1%",
    "Calamine Lotion",
    "Zinc Oxide Cream",
    "Silver Sulfadiazine Cream 1%",
    "Mupirocin Ointment 2%",
    "Fusidic Acid Cream 2%",
    "Clotrimazole Cream 1%",
    "Miconazole Cream 2%",
    "Ketoconazole Cream 2%",
    "Terbinafine Cream 1%",
    "Acyclovir Cream 5%",
    "Permethrin Cream 5%",
    "Benzoyl Peroxide Gel 2.5%",
    "Benzoyl Peroxide Gel 5%",
    "Tretinoin Cream 0.025%",
    "Adapalene Gel 0.1%",
    "Salicylic Acid Gel 2%",
    "Urea Cream 10%",
    "Capsaicin Cream 0.025%",
    "Diclofenac Gel 1%",
    "Ibuprofen Gel 5%",
    "Menthol Ointment",
    "Povidone Iodine Ointment 5%",
    "Gentamicin Cream 0.1%",
    "Neomycin Ointment",

    // 👁️ EYE & EAR DROPS
    "Chloramphenicol Eye Drops 0.5%",
    "Tobramycin Eye Drops 0.3%",
    "Ciprofloxacin Eye Drops 0.3%",
    "Prednisolone Eye Drops 1%",
    "Ketorolac Eye Drops 0.5%",
    "Artificial Tears",
    "Timolol Eye Drops 0.5%",
    "Latanoprost Eye Drops 0.005%",
    "Tropicamide Eye Drops 1%",
    "Cyclopentolate Eye Drops 1%",
    "Ciprofloxacin Ear Drops 0.2%",
    "Ofloxacin Ear Drops 0.3%",
    "Waxsol Ear Drops",
    "Hydrogen Peroxide Ear Drops",

    // 🫁 INHALERS & NASAL
    "Salbutamol Inhaler 100mcg",
    "Budesonide Inhaler 200mcg",
    "Beclomethasone Inhaler 250mcg",
    "Fluticasone Inhaler 125mcg",
    "Salmeterol/Fluticasone Inhaler",
    "Formoterol/Budesonide Inhaler",
    "Ipratropium Inhaler 20mcg",
    "Xylometazoline Nasal Spray 0.1%",
    "Oxymetazoline Nasal Spray 0.05%",
    "Fluticasone Nasal Spray 50mcg",
    "Mometasone Nasal Spray 50mcg",
    "Saline Nasal Spray",

    // 🩸 WOMEN'S HEALTH
    "Tranexamic Acid 500mg",
    "Norethisterone 5mg",
    "Dydrogesterone 10mg",
    "Clotrimazole Pessary 500mg",
    "Miconazole Pessary 1200mg",

    // 🦠 ANTIVIRALS
    "Acyclovir 200mg",
    "Acyclovir 400mg", 
    "Valacyclovir 500mg",
    "Oseltamivir 75mg",

    // 🧴 ANTISEPTICS & WOUND CARE
    "Hydrogen Peroxide 3%",
    "Povidone Iodine Solution 10%",
    "Chlorhexidine Solution 0.2%",
    "Alcohol 70%",
    "Betadine Solution",

    // 🐛 ANTIPARASITICS
    "Albendazole 400mg",
    "Mebendazole 100mg",
    "Praziquantel 600mg",
    "Ivermectin 6mg",
    "Permethrin Lotion 1%",

    // 🩹 EMERGENCY & FIRST AID
    "Epinephrine Auto-Injector 0.3mg",
    "Hydrocortisone Injection 100mg",
    "Glucose Tablets",
    "Activated Charcoal 250mg",

    // 🧒 PEDIATRIC SPECIFIC
    "Paracetamol Drops 80mg/0.8ml",
    "Ibuprofen Drops 100mg/5ml",
    "Domperidone Drops 1mg/ml",
    "Simethicone Drops 20mg/ml",
    "Oral Rehydration Salts",
    "Zinc Drops 10mg/ml",
    "Iron Drops 25mg/ml",
    "Vitamin D Drops 400IU/drop"
].sort();

// Add this after the COMMON_MEDICATIONS list
const COMMON_DOSAGES = [
    "500mg once daily",
    "250mg twice daily",
    "400mg three times daily",
    "1 tablet daily",
    "1 tablet twice daily",
    "2 tablets daily",
    "5ml three times daily",
    "10ml twice daily",
    "1-2 tablets every 4-6 hours as needed",
    "1 capsule daily",
    "2 tablets every 8 hours",
    "1 applicator at bedtime",
    "1 drop in affected eye twice daily",
    "2 puffs every 4-6 hours",
    "Apply to affected area twice daily"
].sort();

// Add this medication-to-dosage mapping after the COMMON_MEDICATIONS list
// Create a mapping of medications to their appropriate dosages
const MEDICATION_DOSAGES: Record<string, string[]> = {
  // ANTIBIOTICS & ANTI-INFECTIVES
  "Amoxicillin 250mg": ["250mg"],
  "Amoxicillin 500mg": ["500mg", "1g"],
  "Amoxicillin/Clavulanate 625mg": ["625mg"],
  "Azithromycin 250mg": ["250mg", "500mg"],
  "Azithromycin 500mg": ["500mg"],
  "Ciprofloxacin 250mg": ["250mg", "750mg"],
  "Ciprofloxacin 500mg": ["500mg", "750mg"],
  "Clindamycin 150mg": ["150mg", "300mg"],
  "Clindamycin 300mg": ["300mg"],
  "Doxycycline 100mg": ["100mg", "200mg"],
  "Erythromycin 250mg": ["250mg"],
  "Metronidazole 400mg": ["400mg", "2g"],
  "Metronidazole 500mg": ["500mg", "2g"],
  "Cephalexin 250mg": ["250mg"],
  "Cephalexin 500mg": ["500mg"],
  "Ceftriaxone": ["500mg", "1g", "2g"],
  "Dexamethasone": ["4mg", "8mg"],
  "Diclofenac": ["50mg", "75mg", "100mg"],
  "Trimethoprim/Sulfamethoxazole 480mg": ["480mg", "960mg"],
  "Nitrofurantoin 50mg": ["50mg"],
  "Nitrofurantoin 100mg": ["100mg"],
  "Norfloxacin 400mg": ["400mg", "800mg"],
  "Norfloxacin": ["400mg", "800mg"],

  // SYRUPS & LIQUID MEDICATIONS
  "Paracetamol Syrup 120mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Paracetamol Syrup 250mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Ibuprofen Syrup 100mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Amoxicillin Syrup 125mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Amoxicillin Syrup 250mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Erythromycin Syrup 125mg/5ml": ["5ml", "10ml"],
  "Azithromycin Syrup 200mg/5ml": ["2.5ml", "5ml"],
  "Cetirizine Syrup 5mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Loratadine Syrup 5mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Salbutamol Syrup 2mg/5ml": ["2.5ml", "5ml", "10ml"],
  "Codeine Cough Syrup 15mg/5ml": ["5ml", "10ml"],
  "Dextromethorphan Syrup 15mg/5ml": ["5ml", "10ml"],
  "Expectorant Syrup 100mg/5ml": ["5ml", "10ml"],
  "Iron Syrup 50mg/5ml": ["2.5ml", "5ml"],
  "Multivitamin Syrup": ["2.5ml", "5ml", "10ml"],
  "Antacid Syrup 10ml": ["5ml", "10ml"],
  "Domperidone Syrup 5mg/5ml": ["2.5ml", "5ml"],
  "Lactulose Syrup 10g/15ml": ["15ml", "30ml"],
  "ORS Solution": ["100ml", "200ml"],
  "Zinc Syrup 10mg/5ml": ["2.5ml", "5ml"],
  
  // COMMON EXTERNAL SYRUPS
  "Exedeve Syrup": ["5ml", "10ml", "15ml"],
  "Exedeve": ["5ml", "10ml", "15ml"],
  "Cough Syrup": ["5ml", "10ml", "15ml"],
  "Antibiotic Syrup": ["5ml", "10ml"],
  "Pain Relief Syrup": ["5ml", "10ml"],
  "Fever Syrup": ["5ml", "10ml"],
  "Allergy Syrup": ["5ml", "10ml"],
  "Cefixime Syrup 100mg/5ml": ["5ml", "10ml"],
  "Cefixime Syrup": ["5ml", "10ml"],
  "Clarithromycin Syrup 125mg/5ml": ["5ml", "10ml"],
  "Clarithromycin Syrup": ["5ml", "10ml"],
  "Prednisolone Syrup 5mg/5ml": ["5ml", "10ml", "15ml"],
  "Prednisolone Syrup": ["5ml", "10ml"],
  "Vitamin D Syrup": ["1ml", "2.5ml", "5ml"],
  "Calcium Syrup": ["5ml", "10ml"],
  "Probiotic Syrup": ["5ml", "10ml"],

  // PAIN & INFLAMMATION
  "Paracetamol 500mg": ["500mg", "1g"],
  "Paracetamol 1000mg": ["1g"],
  "Ibuprofen 200mg": ["200mg", "400mg"],
  "Ibuprofen 400mg": ["400mg", "600mg"],
  "Diclofenac 50mg": ["50mg", "75mg"],
  "Diclofenac 75mg": ["75mg"],
  "Aspirin 75mg": ["75mg"],
  "Aspirin 300mg": ["300mg"],
  "Naproxen 250mg": ["250mg"],
  "Naproxen 500mg": ["500mg"],
  "Tramadol 50mg": ["50mg", "100mg"],
  "Tramadol 100mg": ["100mg"],
  "Anti-Pain Suppository 100mg": ["100mg suppository", "Insert one at night"],
  "Other Suppository": ["Insert one", "As directed"],

  // CARDIOVASCULAR
  "Amlodipine 5mg": ["2.5mg", "5mg", "10mg"],
  "Amlodipine 10mg": ["5mg", "10mg"],
  "Atenolol 50mg": ["25mg", "50mg"],
  "Atenolol 100mg": ["50mg", "100mg"],
  "Atorvastatin 10mg": ["10mg", "20mg"],
  "Atorvastatin 20mg": ["20mg", "40mg"],
  "Simvastatin 10mg": ["10mg", "20mg"],
  "Simvastatin 20mg": ["20mg", "40mg"],
  "Losartan 50mg": ["25mg", "50mg", "100mg"],
  "Losartan 100mg": ["50mg", "100mg"],
  "Enalapril 5mg": ["5mg", "10mg"],
  "Enalapril 10mg": ["5mg", "10mg", "20mg"],
  "Hydrochlorothiazide 25mg": ["12.5mg", "25mg", "50mg"],
  "Metoprolol 50mg": ["25mg", "50mg", "100mg"],
  "Metoprolol 100mg": ["50mg", "100mg"],
  "Lisinopril 10mg": ["10mg once daily", "20mg once daily", "5mg once daily for elderly"],
  "Lisinopril 20mg": ["20mg once daily", "10mg once daily"],
  "Propranolol 40mg": ["40mg twice daily", "40mg three times daily"],
  "Nifedipine 10mg": ["10mg three times daily", "20mg twice daily"],

  // DIGESTIVE & GI
  "Omeprazole 20mg": ["20mg once daily before breakfast", "40mg once daily", "20mg twice daily"],
  "Omeprazole 40mg": ["40mg once daily", "20mg once daily"],
  "Esomeprazole 20mg": ["20mg once daily", "40mg once daily"],
  "Esomeprazole 40mg": ["40mg once daily", "20mg once daily"],
  "Ranitidine 150mg": ["150mg twice daily", "150mg at bedtime"],
  "Ranitidine 300mg": ["300mg at bedtime", "150mg twice daily"],
  "Famotidine 20mg": ["20mg twice daily", "20mg at bedtime"],
  "Famotidine 40mg": ["40mg at bedtime", "20mg twice daily"],
  "Domperidone 10mg": ["10mg three times daily before meals", "10mg four times daily"],
  "Metoclopramide 10mg": ["10mg three times daily", "10mg four times daily"],
  "Loperamide 2mg": ["2mg after each loose stool", "4mg initially then 2mg after each stool"],
  "Mebeverine 135mg": ["135mg three times daily", "135mg twice daily"],
  "Hyoscine Butylbromide 10mg": ["10mg three times daily", "10mg four times daily"],
  "Simethicone 40mg": ["40mg four times daily", "40mg after meals and at bedtime"],
  "Lactulose 10g/15ml": ["15ml twice daily", "30ml twice daily"],
  "Bisacodyl 5mg": ["5-10mg at night", "5mg daily"],
  "Sennosides 8.6mg": ["1-2 tablets at night", "8.6mg-17.2mg at bedtime"],

  // DIABETES & ENDOCRINE
  "Metformin 500mg": ["500mg twice daily with meals", "500mg daily, increase gradually", "850mg twice daily"],
  "Metformin 850mg": ["850mg twice daily", "850mg once daily"],
  "Glimepiride 1mg": ["1mg once daily", "2mg once daily"],
  "Glimepiride 2mg": ["2mg once daily", "1mg once daily"],
  "Gliclazide 80mg": ["80mg once daily", "80mg twice daily"],
  "Glipizide 5mg": ["5mg once daily", "5mg twice daily"],
  "Levothyroxine 25mcg": ["25mcg once daily", "50mcg once daily"],
  "Levothyroxine 50mcg": ["50mcg once daily", "100mcg once daily"],
  "Levothyroxine 100mcg": ["100mcg once daily", "50mcg once daily"],

  // RESPIRATORY
  "Salbutamol 2mg": ["2mg three times daily", "2mg four times daily"],
  "Salbutamol 4mg": ["4mg three times daily", "4mg twice daily"],
  "Montelukast 4mg": ["4mg once daily in evening", "4mg daily"],
  "Montelukast 5mg": ["5mg once daily in evening", "5mg daily"],
  "Montelukast 10mg": ["10mg once daily in evening", "10mg daily"],
  "Theophylline 200mg": ["200mg twice daily", "200mg daily"],
  "Prednisolone 5mg": ["5mg daily", "40mg daily then taper", "5-60mg daily depends on condition"],
  "Prednisolone 10mg": ["10mg daily", "20mg daily", "5mg daily"],
  "Budesonide 3mg": ["3mg three times daily", "3mg twice daily"],
  "Cetirizine 10mg": ["10mg once daily", "5mg once daily", "10mg at bedtime"],
  "Loratadine 10mg": ["10mg once daily", "10mg every morning", "5mg daily for liver impairment"],
  "Fexofenadine 120mg": ["120mg once daily", "120mg every morning"],
  "Fexofenadine 180mg": ["180mg once daily", "120mg once daily"],
  "Chlorpheniramine 4mg": ["4mg every 4-6 hours", "4mg three times daily"],

  // NEUROLOGICAL & MENTAL HEALTH
  "Amitriptyline 10mg": ["10mg at bedtime", "25mg at bedtime"],
  "Amitriptyline 25mg": ["25mg at bedtime", "50mg at bedtime"],
  "Fluoxetine 20mg": ["20mg once daily in the morning", "40mg once daily", "10mg daily for elderly"],
  "Sertraline 50mg": ["50mg once daily", "100mg once daily", "25mg daily initially"],
  "Sertraline 100mg": ["100mg once daily", "50mg once daily"],
  "Escitalopram 10mg": ["10mg once daily", "20mg once daily"],
  "Escitalopram 20mg": ["20mg once daily", "10mg once daily"],
  "Diazepam 2mg": ["2mg three times daily", "2mg at bedtime"],
  "Diazepam 5mg": ["5mg three times daily", "5mg at bedtime"],
  "Lorazepam 1mg": ["1mg twice daily", "1mg three times daily"],
  "Lorazepam 2mg": ["2mg at bedtime", "1mg three times daily"],
  "Clonazepam 0.5mg": ["0.5mg twice daily", "0.5mg three times daily"],
  "Clonazepam 2mg": ["2mg at bedtime", "1mg twice daily"],
  "Gabapentin 100mg": ["100mg three times daily", "300mg three times daily"],
  "Gabapentin 300mg": ["300mg three times daily", "300mg at bedtime"],
  "Pregabalin 75mg": ["75mg twice daily", "75mg three times daily"],
  "Pregabalin 150mg": ["150mg twice daily", "75mg twice daily"],
  "Carbamazepine 200mg": ["200mg twice daily", "200mg three times daily"],
  "Phenytoin 100mg": ["100mg three times daily", "300mg daily"],
  "Valproate 200mg": ["200mg twice daily", "200mg three times daily"],

  // VITAMINS & SUPPLEMENTS
  "Calcium Carbonate 500mg": ["500mg twice daily", "500mg three times daily"],
  "Calcium + Vitamin D3": ["1 tablet daily", "1 tablet twice daily"],
  "Vitamin D3 1000IU": ["1000IU daily", "2000IU daily"],
  "Vitamin D3 5000IU": ["5000IU daily", "5000IU weekly"],
  "Iron 65mg": ["65mg once daily", "65mg twice daily"],
  "Iron + Folic Acid": ["1 tablet daily", "1 tablet twice daily"],
  "Folic Acid 5mg": ["5mg daily", "5mg weekly"],
  "Vitamin B12 1000mcg": ["1000mcg daily", "1000mcg weekly"],
  "Vitamin B Complex": ["1 tablet daily", "1 tablet twice daily"],
  "Multivitamin Tablets": ["1 tablet daily", "1 tablet with breakfast"],
  "Zinc 10mg": ["10mg daily", "10mg twice daily"],
  "Magnesium 200mg": ["200mg daily", "200mg twice daily"],

  // ANTIFUNGALS
  "Fluconazole 150mg": ["150mg single dose", "150mg weekly"],
  "Fluconazole 200mg": ["200mg daily", "200mg weekly"],
  "Itraconazole 100mg": ["100mg daily", "100mg twice daily"],
  "Ketoconazole 200mg": ["200mg daily", "200mg twice daily"],
  "Terbinafine 250mg": ["250mg daily", "250mg daily for 6-12 weeks"],
  "Griseofulvin 250mg": ["250mg twice daily", "500mg daily"],
  "Nystatin 500000IU": ["500000IU four times daily", "1 million IU four times daily"],
  "Miconazole 2% Oral Gel": ["Apply 2.5ml four times daily", "Apply after meals"],

  // TOPICAL MEDICATIONS
  "Hydrocortisone Cream 1%": ["Apply twice daily", "Apply three times daily"],
  "Betamethasone Cream 0.1%": ["Apply twice daily", "Apply once daily"],
  "Clobetasol Ointment 0.05%": ["Apply twice daily", "Apply once daily"],
  "Mometasone Cream 0.1%": ["Apply once daily", "Apply twice daily"],
  "Triamcinolone Cream 0.1%": ["Apply twice daily", "Apply three times daily"],
  "Calamine Lotion": ["Apply as needed", "Apply three times daily"],
  "Zinc Oxide Cream": ["Apply as needed", "Apply after each diaper change"],
  "Silver Sulfadiazine Cream 1%": ["Apply twice daily", "Apply daily"],
  "Mupirocin Ointment 2%": ["Apply three times daily", "Apply twice daily"],
  "Fusidic Acid Cream 2%": ["Apply three times daily", "Apply four times daily"],
  "Clotrimazole Cream 1%": ["Apply twice daily", "Apply three times daily"],
  "Miconazole Cream 2%": ["Apply twice daily", "Apply twice daily for 2-4 weeks"],
  "Ketoconazole Cream 2%": ["Apply once daily", "Apply twice daily"],
  "Terbinafine Cream 1%": ["Apply twice daily", "Apply once daily"],
  "Acyclovir Cream 5%": ["Apply five times daily", "Apply every 4 hours"],
  "Permethrin Cream 5%": ["Apply once, wash off after 8-14 hours", "Single application"],
  "Benzoyl Peroxide Gel 2.5%": ["Apply once daily", "Apply twice daily"],
  "Benzoyl Peroxide Gel 5%": ["Apply once daily", "Apply twice daily"],
  "Tretinoin Cream 0.025%": ["Apply once daily at night", "Apply every other night"],
  "Adapalene Gel 0.1%": ["Apply once daily at night", "Apply every other night"],
  "Salicylic Acid Gel 2%": ["Apply twice daily", "Apply once daily"],
  "Urea Cream 10%": ["Apply twice daily", "Apply as needed"],
  "Capsaicin Cream 0.025%": ["Apply three times daily", "Apply four times daily"],
  "Diclofenac Gel 1%": ["Apply three times daily", "Apply four times daily"],
  "Ibuprofen Gel 5%": ["Apply three times daily", "Apply as needed"],
  "Menthol Ointment": ["Apply as needed", "Apply three times daily"],
  "Povidone Iodine Ointment 5%": ["Apply twice daily", "Apply once daily"],
  "Gentamicin Cream 0.1%": ["Apply three times daily", "Apply four times daily"],
  "Neomycin Ointment": ["Apply three times daily", "Apply twice daily"],

  // EYE & EAR DROPS
  "Chloramphenicol Eye Drops 0.5%": ["1 drop every 2 hours", "1 drop four times daily"],
  "Tobramycin Eye Drops 0.3%": ["1 drop every 4 hours", "1 drop twice daily"],
  "Ciprofloxacin Eye Drops 0.3%": ["1 drop every 2 hours", "1 drop four times daily"],
  "Prednisolone Eye Drops 1%": ["1 drop four times daily", "1 drop twice daily"],
  "Ketorolac Eye Drops 0.5%": ["1 drop four times daily", "1 drop twice daily"],
  "Artificial Tears": ["1 drop as needed", "1 drop four times daily"],
  "Timolol Eye Drops 0.5%": ["1 drop twice daily", "1 drop once daily"],
  "Latanoprost Eye Drops 0.005%": ["1 drop once daily at night", "1 drop daily"],
  "Tropicamide Eye Drops 1%": ["1 drop before examination", "1 drop as directed"],
  "Cyclopentolate Eye Drops 1%": ["1 drop before examination", "1 drop as directed"],
  "Ciprofloxacin Ear Drops 0.2%": ["3 drops twice daily", "3 drops three times daily"],
  "Ofloxacin Ear Drops 0.3%": ["5 drops twice daily", "3 drops twice daily"],
  "Waxsol Ear Drops": ["Fill ear for 2 nights", "5 drops twice daily"],
  "Hydrogen Peroxide Ear Drops": ["5 drops as needed", "Fill ear canal"],

  // INHALERS & NASAL
  "Salbutamol Inhaler 100mcg": ["2 puffs every 4-6 hours as needed", "1-2 puffs 15-30 minutes before exercise"],
  "Budesonide Inhaler 200mcg": ["2 puffs twice daily", "1 puff twice daily"],
  "Beclomethasone Inhaler 250mcg": ["2 puffs twice daily", "1 puff twice daily"],
  "Fluticasone Inhaler 125mcg": ["2 puffs twice daily", "1 puff twice daily"],
  "Salmeterol/Fluticasone Inhaler": ["2 puffs twice daily", "1 puff twice daily"],
  "Formoterol/Budesonide Inhaler": ["2 puffs twice daily", "1 puff twice daily"],
  "Ipratropium Inhaler 20mcg": ["2 puffs four times daily", "2 puffs three times daily"],
  "Xylometazoline Nasal Spray 0.1%": ["1 spray each nostril twice daily", "1 spray three times daily"],
  "Oxymetazoline Nasal Spray 0.05%": ["1 spray each nostril twice daily", "1 spray as needed"],
  "Fluticasone Nasal Spray 50mcg": ["2 sprays each nostril once daily", "1 spray twice daily"],
  "Mometasone Nasal Spray 50mcg": ["2 sprays each nostril once daily", "1 spray once daily"],
  "Saline Nasal Spray": ["As needed", "2 sprays each nostril as needed"],

      // WOMEN'S HEALTH
    "Tranexamic Acid 500mg": ["500mg three times daily", "1g three times daily"],
  "Norethisterone 5mg": ["5mg three times daily", "5mg twice daily"],
  "Dydrogesterone 10mg": ["10mg twice daily", "10mg once daily"],
  "Clotrimazole Pessary 500mg": ["Insert one at night", "Single dose"],
  "Miconazole Pessary 1200mg": ["Insert one at night", "Single dose"],

  // ANTIVIRALS
  "Acyclovir 200mg": ["200mg five times daily", "400mg three times daily"],
  "Acyclovir 400mg": ["400mg three times daily", "800mg twice daily"],
  "Valacyclovir 500mg": ["500mg twice daily", "1g twice daily"],
  "Oseltamivir 75mg": ["75mg twice daily", "75mg once daily"],

  // ANTISEPTICS & WOUND CARE
  "Hydrogen Peroxide 3%": ["Apply to wound as needed", "Clean wound twice daily"],
  "Povidone Iodine Solution 10%": ["Apply to wound twice daily", "Apply as directed"],
  "Chlorhexidine Solution 0.2%": ["Apply twice daily", "Use as mouthwash"],
  "Alcohol 70%": ["Apply to skin as needed", "For external use only"],
  "Betadine Solution": ["Apply to wound twice daily", "Apply as directed"],

  // ANTIPARASITICS
  "Albendazole 400mg": ["400mg single dose", "400mg daily for 3 days"],
  "Mebendazole 100mg": ["100mg twice daily for 3 days", "100mg single dose"],
  "Praziquantel 600mg": ["600mg as single dose", "10-20mg/kg single dose"],
  "Ivermectin 6mg": ["6mg single dose", "12mg single dose"],
  "Permethrin Lotion 1%": ["Apply once, wash after 8-14 hours", "Single application"],

  // EMERGENCY & FIRST AID
  "Epinephrine Auto-Injector 0.3mg": ["0.3mg intramuscularly as needed", "Emergency use only"],
  "Hydrocortisone Injection 100mg": ["100mg intramuscularly", "As directed by physician"],
  "Glucose Tablets": ["1-2 tablets as needed", "For hypoglycemia"],
  "Activated Charcoal 250mg": ["250mg as directed", "For poisoning - medical supervision"],

  // PEDIATRIC SPECIFIC
  "Paracetamol Drops 80mg/0.8ml": ["0.8ml every 4-6 hours", "1.6ml every 6 hours"],
  "Ibuprofen Drops 100mg/5ml": ["2.5ml three times daily", "1.25ml three times daily"],
  "Domperidone Drops 1mg/ml": ["1ml three times daily", "0.5ml three times daily"],
  "Simethicone Drops 20mg/ml": ["1ml four times daily", "0.5ml four times daily"],
  "Oral Rehydration Salts": ["As per WHO guidelines", "200ml after each loose stool"],
  "Zinc Drops 10mg/ml": ["1ml daily", "0.5ml daily"],
  "Iron Drops 25mg/ml": ["1ml daily", "0.5ml daily"],
  "Vitamin D Drops 400IU/drop": ["1 drop daily", "2 drops daily"]
};

// Most subscribed routes (most commonly prescribed)
const MOST_SUBSCRIBED_ROUTES = [
    "Oral",
    "Topical",
    "Intramuscular",
    "Intravenous",
    "Inhalation",
    "Sublingual",
    "Suppository",
    "Ophthalmic",
    "Nasal"
];

// Add medication routes after the COMMON_DOSAGES list
const MEDICATION_ROUTES = [
    "Oral",
    "Topical",
    "Intravenous",
    "Intramuscular",
    "Subcutaneous",
    "Inhalation",
    "Sublingual",
    "Rectal",
    "Suppository",
    "Ophthalmic",
    "Otic",
    "Nasal",
    "Transdermal"
].sort();

// Most subscribed durations (most commonly prescribed)
const MOST_SUBSCRIBED_DURATIONS = [
    "7 days",
    "10 days",
    "14 days",
    "5 days",
    "3 days",
    "1 month",
    "21 days",
    "2 weeks",
    "1 week",
    "30 days"
];

// Enhanced prescription durations - Medical Grade
const COMMON_DURATIONS = [
    // Short-term (Days)
    "1 day",
    "2 days", 
    "3 days",
    "4 days",
    "5 days",
    "6 days",
    "7 days",
    "8 days",
    "9 days",
    "10 days",
    "11 days",
    "12 days",
    "13 days",
    "14 days",
    "15 days",
    "16 days",
    "17 days",
    "18 days",
    "19 days",
    "20 days",
    "21 days",
    "28 days",
    
    // Weekly durations
    "1 week",
    "2 weeks",
    "3 weeks",
    "4 weeks",
    "6 weeks",
    "8 weeks",
    "10 weeks",
    "12 weeks",
    
    // Monthly durations
    "1 month",
    "1.5 months",
    "2 months",
    "2.5 months",
    "3 months",
    "4 months",
    "5 months",
    "6 months",
    "7 months",
    "8 months",
    "9 months",
    "10 months",
    "11 months",
    "12 months",
    
    // Extended durations
    "18 months",
    "2 years",
    "2.5 years",
    "3 years",
    "4 years",
    "5 years",
    
    // Special medical durations
    "Single dose",
    "One-time use",
    "Loading dose only",
    "Maintenance dose",
    "Tapering schedule",
    "Cyclical therapy",
    "Pulse therapy",
    "Continuous therapy",
    
    // Condition-based durations
    "Until symptoms resolve",
    "Until pain free",
    "Until fever resolves",
    "Until infection clears",
    "Until lab values normalize",
    "Until blood pressure controlled",
    "Until blood sugar controlled",
    "Until follow-up visit",
    "Until next appointment",
    "Until specialist consultation",
    
    // Chronic conditions
    "Lifelong therapy",
    "Long-term maintenance",
    "Chronic management",
    "Ongoing treatment",
    "Indefinite duration",
    
    // Emergency/Stat
    "Emergency use only",
    "As needed for symptoms",
    "PRN (as needed)",
    "Breakthrough pain only",
    "Rescue medication",
    
    // Follow-up based
    "Until follow-up",
    "Until re-evaluation",
    "Until next visit",
    "Until specialist review",
    "Until treatment response",
    "Until side effects resolve",
    
    // Custom durations
    "Custom duration",
    "As directed by physician",
    "Per protocol",
    "According to guidelines",
    "Based on response"
];

// Most subscribed frequencies (most commonly prescribed)
const MOST_SUBSCRIBED_FREQUENCIES = [
    "Once daily (QD)",
    "Twice daily (BID)",
    "Three times daily (TID)",
    "Every 8 hours",
    "Every 6 hours",
    "Every 12 hours",
    "As needed (PRN)",
    "With meals",
    "At bedtime (HS)",
    "In the morning (AM)"
];

// Enhanced frequency options - Medical Grade
const ENHANCED_FREQUENCIES = [
    // Standard Daily Frequencies
    "Once daily (QD)",
    "Twice daily (BID)", 
    "Three times daily (TID)",
    "Four times daily (QID)",
    "Five times daily",
    "Six times daily",
    
    // Hourly Intervals
    "Every 1 hour",
    "Every 2 hours",
    "Every 3 hours",
    "Every 4 hours",
    "Every 6 hours", 
    "Every 8 hours",
    "Every 12 hours",
    "Every 24 hours",
    
    // Meal-Related
    "Before meals (AC)",
    "After meals (PC)",
    "With meals",
    "On empty stomach",
    "30 minutes before meals",
    "1 hour after meals",
    
    // Time-Specific
    "In the morning (AM)",
    "In the evening (PM)",
    "At bedtime (HS)",
    "At noon",
    "Twice daily - morning and evening",
    "Three times daily - with meals",
    
    // As Needed
    "As needed (PRN)",
    "As needed for pain",
    "As needed for fever",
    "As needed for nausea",
    "As needed for anxiety",
    "As needed for sleep",
    
    // Weekly Frequencies
    "Once weekly",
    "Twice weekly",
    "Three times weekly",
    "Every other day",
    "Every 3 days",
    "Every 4 days",
    
    // Monthly and Extended
    "Once monthly",
    "Every 2 weeks",
    "Every 3 weeks",
    "Every 4 weeks",
    "Every 6 weeks",
    "Every 8 weeks",
    "Every 12 weeks",
    
    // Special Medical Frequencies
    "Continuous infusion",
    "Bolus dose",
    "Loading dose then maintenance",
    "Tapering dose",
    "Pulse therapy",
    "Cyclical therapy",
    
    // Emergency/Stat
    "Stat (immediately)",
    "Emergency use only",
    "Rescue medication",
    "Breakthrough dose",
    
    // Monitoring/Follow-up
    "Until follow-up",
    "Until symptoms resolve",
    "Until lab values normalize",
    "Lifelong therapy",
    "Ongoing as prescribed"
];

// Common general instructions
const COMMON_INSTRUCTIONS = [
    "Take with plenty of water",
    "Take with food to reduce stomach upset", 
    "Take on empty stomach",
    "Do not crush or chew",
    "Complete the full course even if symptoms improve",
    "Avoid alcohol while taking this medication",
    "May cause drowsiness - avoid driving",
    "Store in refrigerator",
    "Keep out of reach of children",
    "Take at the same time each day",
    "Do not stop suddenly without consulting doctor",
    "Monitor blood pressure regularly",
    "Monitor blood sugar levels",
    "Report any unusual side effects immediately",
    "Follow up in 2 weeks",
    "Return if symptoms worsen"
];

// Common special instructions for specific medications
const COMMON_SPECIAL_INSTRUCTIONS = [
    "Take with food",
    "Take on empty stomach",
    "Avoid alcohol",
    "May cause drowsiness",
    "Take at bedtime",
    "Shake well before use",
    "Store in refrigerator",
    "Do not crush or chew",
    "Take with plenty of water",
    "Avoid dairy products",
    "Avoid sun exposure",
    "Complete full course",
    "Take same time daily",
    "Monitor blood pressure",
    "Monitor blood sugar",
    "May cause dizziness"
];

// Auto-suggest routes based on medication type
const MEDICATION_ROUTE_SUGGESTIONS: Record<string, string> = {
    "Albuterol Inhaler": "Inhalation",
    "Eye Drops": "Ophthalmic",
    "Ear Drops": "Otic",
    "Nasal Spray": "Nasal",
    "Suppository": "Suppository",
    "Insulin": "Subcutaneous",
    "Topical Cream": "Topical",
    "Topical Ointment": "Topical",
    "Sublingual Tablet": "Sublingual",
    "Transdermal Patch": "Transdermal"
};

// Drug interaction warnings
const DRUG_INTERACTIONS: Record<string, string[]> = {
    "Warfarin": ["Aspirin", "Ibuprofen", "Metronidazole", "Ciprofloxacin"],
    "Aspirin": ["Warfarin", "Methotrexate", "Lithium"],
    "Metformin": ["Contrast Dye", "Alcohol"],
    "Digoxin": ["Amiodarone", "Verapamil", "Quinidine"],
    "Lithium": ["ACE Inhibitors", "Diuretics", "NSAIDs"]
};

// Allergy warnings for common medications
const ALLERGY_WARNINGS: Record<string, string[]> = {
    "Penicillin": ["Amoxicillin", "Ampicillin", "Penicillin G"],
    "Sulfa": ["Sulfamethoxazole", "Trimethoprim-Sulfamethoxazole"],
    "Aspirin": ["Aspirin", "NSAIDs", "Ibuprofen", "Naproxen"]
};

// Interface for nurse data
interface Nurse {
    id: string;
    firstName: string;
    lastName: string;
    department?: string;
}

// Interface for a single medication item with inventory integration
interface MedicationItem {
    medication: string;
    medicationType: 'inventory' | 'external' | 'service'; // Type of item
    inventoryItemId?: string | null; // Link to inventory item
    inventoryItem?: InventoryItem; // Full inventory item data
    serviceId?: string | null; // Link to clinic service (when medicationType === 'service')
    service?: (Service & { inventoryStatus?: any }) | null; // Full service data (enriched by backend when requested)
    dosage: string;
    frequency: string;
    duration?: string; // Individual duration for each medication
    route?: string;
    quantity?: number; // Quantity to dispense
    nurseInstructions?: string; // Instructions for the nurse
    serviceNotes?: string; // Notes for service request (when medicationType === 'service')
    sendToNurse?: boolean; // Flag to indicate if this medication should be sent to nurse
    assignedNurseId?: string | null; // ID of the assigned nurse
    isFromInventory?: boolean; // Flag indicating if medication is from clinic inventory
    requiresPayment?: boolean; // Flag indicating if payment is required at reception
}

interface PrescriptionData {
    medications: MedicationItem[];
    duration: string;
    refills: number;
    deaNumber?: string;
    instructions?: string;
    visitId?: string;
    hasInventoryItems?: boolean;
    hasExternalPrescriptions?: boolean;
    inventoryMedicationsCount?: number;
    externalPrescriptionsCount?: number;
}

interface ProfessionalPrescriptionFormProps {
    patient: Patient | null; // Accept the selected patient object
    onClose: () => void;
    onSubmit: (prescription: PrescriptionData) => Promise<void>; // Function to handle submission
}

const ProfessionalPrescriptionForm: React.FC<ProfessionalPrescriptionFormProps> = ({ patient, onClose, onSubmit }) => {
    const { user, getToken } = useAuth(); // Get doctor info from context
    const [medications, setMedications] = useState<MedicationItem[]>([{
        medication: '',
        medicationType: 'inventory', // Default to inventory search
        inventoryItemId: null,
        serviceId: null,
        service: null,
        dosage: '',
        frequency: 'Once daily (QD)',
        duration: '',
        route: 'Oral',
        quantity: 1, // Start minimal; will be recalculated when duration/frequency set
        nurseInstructions: '',
        serviceNotes: '',
        sendToNurse: false,
        assignedNurseId: null,
    }]);
    const [nurses, setNurses] = useState<Nurse[]>([]);
    const [availableInventoryMedications, setAvailableInventoryMedications] = useState<InventoryItem[]>([]);
    const [availableServices, setAvailableServices] = useState<Array<Service & { inventoryStatus?: any }>>([]);
    const [globalNurseId, setGlobalNurseId] = useState<string>('');
    const [sendAllToNurse, setSendAllToNurse] = useState<boolean>(false);
    const [prescription, setPrescription] = useState<PrescriptionData>({
        medications: [],
        duration: '',
        refills: 0,
        deaNumber: '',
        instructions: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [customMedication, setCustomMedication] = useState<{[index: number]: boolean}>({0: false});
    const [customDosage, setCustomDosage] = useState<{[index: number]: boolean}>({0: false});
    const [customInstructions, setCustomInstructions] = useState(false);
    const [customDuration, setCustomDuration] = useState<{[key: string]: boolean}>({});
    const [customSpecialInstructions, setCustomSpecialInstructions] = useState<{[index: number]: boolean}>({0: false});
    const [drugInteractions, setDrugInteractions] = useState<string[]>([]);
    const [showInteractionWarning, setShowInteractionWarning] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    // Extension modal removed - simplified prescription system
    // Saved external medications (persisted locally for quick reuse)
    const [savedExternalMeds, setSavedExternalMeds] = useState<string[]>([]);
    const [isNewExternalAtIndex, setIsNewExternalAtIndex] = useState<{[index: number]: boolean}>({});
    const SAVED_EXTERNAL_MEDS_KEY = 'nlc_saved_external_meds';
    const SAVED_CUSTOM_DOSAGES_KEY = 'nlc_saved_custom_dosages';
    const [savedCustomDosages, setSavedCustomDosages] = useState<string[]>([]);

    // Persist a custom dosage for next time (on blur of Custom dosage field only, to avoid saving partial typing like "4", "45", "450m")
    const saveCustomDosageForNextTime = (dosage: string) => {
        const trimmed = dosage?.trim();
        if (!trimmed || trimmed.length < 3) return; // ignore very short fragments
        setSavedCustomDosages(prev => {
            const next = [trimmed, ...prev.filter(d => d !== trimmed)].slice(0, 50);
            try {
                localStorage.setItem(SAVED_CUSTOM_DOSAGES_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    // Fetch available medications from inventory and nurses on component mount
    useEffect(() => {
        const fetchData = async () => {
            // Fetch available medications from inventory
            try {
                const inventoryMeds = await inventoryService.getMedicationsForPrescription();
                setAvailableInventoryMedications(inventoryMeds);
            } catch (error) {
                console.error('Error fetching medications for prescription:', error);
                setAvailableInventoryMedications([]);
                // Keep form usable even if inventory endpoint has issues
                toast.error('Unable to load inventory medications');
            }

            // Fetch clinic services (with inventory linkage info)
            try {
                const services = await serviceService.getAllWithInventory({ active: true });
                setAvailableServices(Array.isArray(services) ? services : []);
            } catch (serviceErr) {
                console.error('Error fetching services:', serviceErr);
                setAvailableServices([]);
            }
                
            // Load saved external medications from localStorage
            const stored = localStorage.getItem(SAVED_EXTERNAL_MEDS_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setSavedExternalMeds(parsed.filter(Boolean));
                    }
                } catch {}
            }
            // Load saved custom dosages from localStorage (ignore very short fragments and typing intermediates)
            const storedDosages = localStorage.getItem(SAVED_CUSTOM_DOSAGES_KEY);
            if (storedDosages) {
                try {
                    const parsed = JSON.parse(storedDosages);
                    if (Array.isArray(parsed)) {
                        const trimmed = parsed.filter((d): d is string => typeof d === 'string' && d.trim().length >= 3).map((d: string) => d.trim());
                        // Remove entries that are strict prefixes of another (e.g. keep "450mg", drop "4", "45", "450", "450m")
                        const valid = trimmed.filter(
                            (d) => !trimmed.some((other) => other !== d && other.startsWith(d))
                        );
                        setSavedCustomDosages(valid);
                        if (valid.length !== parsed.length) {
                            localStorage.setItem(SAVED_CUSTOM_DOSAGES_KEY, JSON.stringify(valid));
                        }
                    }
                } catch {}
            }
                
            // Fetch nurses using shared API client so base URL/env config is respected
            try {
                const nurseResponse = await api.get('/api/nurse/all');
                const nursesData = nurseResponse?.data;
                const nursesList = Array.isArray(nursesData?.data)
                    ? nursesData.data
                    : Array.isArray(nursesData)
                        ? nursesData
                        : [];

                if (!Array.isArray(nursesList)) {
                    console.error('Failed to parse nurses response:', nursesData);
                    toast.error('Failed to load nurses list');
                } else {
                    setNurses(nursesList);
                }
            } catch (error) {
                console.error('Error fetching nurses:', error);
                setNurses([]);
                toast.error('Failed to load nurses list');
            }
        };

        fetchData();
    }, [getToken]);

    // Clear extension eligibility when patient changes
    // Extension eligibility useEffect removed - simplified prescription system

    // Add a medication to the list
    const addMedication = (index: number) => {
        setMedications([...medications, {
            medication: '',
            medicationType: 'inventory', // Default to inventory search
            inventoryItemId: null,
            serviceId: null,
            service: null,
            dosage: '',
            frequency: 'Once daily (QD)',
            duration: '',
            route: 'Oral',
            quantity: 1, // Will be recalculated after user sets duration/frequency
            nurseInstructions: '',
            serviceNotes: '',
            sendToNurse: false,
            assignedNurseId: null,
        }]);
        const newIndex = medications.length;
        setCustomMedication({...customMedication, [newIndex]: false});
        setCustomDosage({...customDosage, [newIndex]: false});
        setCustomSpecialInstructions({...customSpecialInstructions, [newIndex]: false});
        
        // Initialize extension eligibility for new medication
        setExtensionEligibility(prev => ({ ...prev, [newIndex]: false }));
        setCheckingEligibility(prev => ({ ...prev, [newIndex]: false }));
    };
    
    // Remove a medication from the list
    const removeMedication = (index: number) => {
        if (medications.length <= 1) return; // Keep at least one medication
        const newMedications = [...medications];
        newMedications.splice(index, 1);
        setMedications(newMedications);
        
        // Clear extension eligibility for removed medication
        setExtensionEligibility(prev => {
            const newEligibility = { ...prev };
            delete newEligibility[index];
            return newEligibility;
        });
        
        // Clear checking eligibility for removed medication
        setCheckingEligibility(prev => {
            const newChecking = { ...prev };
            delete newChecking[index];
            return newChecking;
        });
        
        // Update custom states
        const newCustomMed = {...customMedication};
        const newCustomDosage = {...customDosage};
        const newCustomSpecialInstructions = {...customSpecialInstructions};
        delete newCustomMed[index];
        delete newCustomDosage[index];
        delete newCustomSpecialInstructions[index];
        setCustomMedication(newCustomMed);
        setCustomDosage(newCustomDosage);
        setCustomSpecialInstructions(newCustomSpecialInstructions);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
        const { name, value } = e.target;
        
        // If this is a medication/service item field (has an index)
        if (index !== undefined && ['medication', 'dosage', 'frequency', 'route', 'nurseInstructions', 'serviceNotes'].includes(name)) {
            const updatedMedications = [...medications];
            updatedMedications[index] = {
                ...updatedMedications[index],
                [name]: value,
            };

            // If the medication name is being changed, try to find a matching inventory item
            if (name === 'medication') {
                // Service selection (from clinic services)
                if (updatedMedications[index].medicationType === 'service') {
                    const matchedService = availableServices.find(
                        s => (s.name || '').toLowerCase() === value.toLowerCase()
                    );
                    if (matchedService) {
                        updatedMedications[index].serviceId = matchedService._id;
                        updatedMedications[index].service = matchedService;
                        updatedMedications[index].quantity = Math.max(1, Number(updatedMedications[index].quantity || 1));
                    } else {
                        updatedMedications[index].serviceId = null;
                        updatedMedications[index].service = null;
                    }
                    // Clear medication-only fields to avoid confusion
                    updatedMedications[index].inventoryItemId = null;
                    updatedMedications[index].inventoryItem = undefined;
                    updatedMedications[index].dosage = '';
                    updatedMedications[index].frequency = '';
                    updatedMedications[index].duration = '';
                    updatedMedications[index].route = '';
                }
                // Only search inventory if medication type is 'inventory'
                else if (updatedMedications[index].medicationType === 'inventory') {
                    const matchedInventoryItem = availableInventoryMedications.find(
                        item => item.name.toLowerCase() === value.toLowerCase()
                    );
                    if (matchedInventoryItem) {
                        updatedMedications[index].inventoryItemId = matchedInventoryItem._id;
                        updatedMedications[index].inventoryItem = matchedInventoryItem;
                        
                        // Auto-fetch dosage from inventory item if available
                        if (matchedInventoryItem.dosage && !updatedMedications[index].dosage) {
                            updatedMedications[index].dosage = matchedInventoryItem.dosage;
                        }
                        
                        // Auto-suggest route from inventory item if available
                        if (matchedInventoryItem.administrationRoute && !updatedMedications[index].route) {
                            updatedMedications[index].route = matchedInventoryItem.administrationRoute;
                        }
                        
                        // Calculate quantity if frequency and duration are available
                        if (updatedMedications[index].frequency && updatedMedications[index].duration) {
                            const frequency = updatedMedications[index].frequency;
                            const duration = updatedMedications[index].duration;
                            updatedMedications[index].quantity = calculateQuantity(frequency, duration);
                        }
                    } else {
                        // If no match, ensure inventory details are cleared
                        updatedMedications[index].inventoryItemId = null;
                        updatedMedications[index].inventoryItem = undefined;
                        updatedMedications[index].quantity = 1; // Reset to default
                    }
                } else {
                    // For external medications, clear inventory details
                    updatedMedications[index].inventoryItemId = null;
                    updatedMedications[index].inventoryItem = undefined;
                    updatedMedications[index].quantity = 1; // Reset to default
                    updatedMedications[index].serviceId = null;
                    updatedMedications[index].service = null;
                }
                
                // Check extension eligibility for this medication
                if (updatedMedications[index].medicationType !== 'service' && value.trim()) {
                    checkExtensionEligibility(index, value);
                } else {
                    setExtensionEligibility(prev => ({ ...prev, [index]: false }));
                }
            }

            setMedications(updatedMedications);
            
            // Clear related error if it exists
            if (errors[`medications[${index}].${name}`]) {
                const newErrors = {...errors};
                delete newErrors[`medications[${index}].${name}`];
                setErrors(newErrors);
            }
        } else {
            // For non-medication fields (like duration, instructions)
            setPrescription(prev => ({ ...prev, [name]: value }));
            if (errors[name]) {
                const newErrors = {...errors};
                delete newErrors[name];
                setErrors(newErrors);
            }
        }
    };

    // Handle select changes for dropdowns
    const handleSelectChange = (name: string, value: string, index?: number) => {
        console.log(`${name} changed:`, value, 'for index:', index);
        
        if (index !== undefined) {
            const updatedMedications = [...medications];
            
            switch (name) {
                case 'dosage':
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        dosage: value
                    };
                    break;
                case 'frequency':
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        frequency: value
                    };
                    // Auto-update quantity when frequency changes
                    if (updatedMedications[index].duration) {
                        const calculatedQuantity = calculateQuantity(value, updatedMedications[index].duration);
                        updatedMedications[index].quantity = calculatedQuantity;
                    }
                    break;
                case 'duration':
                    console.log(`🔧 [DURATION CHANGE] Medication ${index} duration changed from "${updatedMedications[index].duration}" to "${value}"`);
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        duration: value
                    };
                    // Auto-update quantity when duration changes
                    if (updatedMedications[index].frequency) {
                        const calculatedQuantity = calculateQuantity(updatedMedications[index].frequency, value);
                        updatedMedications[index].quantity = calculatedQuantity;
                    }
                    console.log(`🔧 [DURATION CHANGE] Updated medication ${index}:`, updatedMedications[index]);
                    console.log(`🔧 [DURATION CHANGE] All medications after update:`, updatedMedications.map(med => ({ 
                        name: med.medication, 
                        duration: med.duration,
                        frequency: med.frequency 
                    })));
                    break;
                case 'route':
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        route: value
                    };
                    break;
                case 'nurseInstructions':
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        nurseInstructions: value
                    };
                    break;
                case 'assignedNurseId':
                    updatedMedications[index] = {
                        ...updatedMedications[index],
                        assignedNurseId: value
                    };
                    break;
                // Add other cases as needed
            }
            
            setMedications(updatedMedications);
        } else {
            // Handle global prescription changes if needed
            setPrescription(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle global nurse selection for all medications
    const handleGlobalNurseChange = (nurseId: string) => {
        setGlobalNurseId(nurseId);
        
        // Update all medications with the selected nurse
        const updatedMedications = medications.map(med => ({
            ...med,
            assignedNurseId: nurseId,
            sendToNurse: sendAllToNurse
        }));
        setMedications(updatedMedications);
    };

    // Handle global "Send to Nurse" toggle
    const handleSendAllToNurse = (sendToNurse: boolean) => {
        setSendAllToNurse(sendToNurse);
        
        // Update all medications
        const updatedMedications = medications.map(med => ({
            ...med,
            sendToNurse: sendToNurse,
            assignedNurseId: sendToNurse ? globalNurseId : null
        }));
        setMedications(updatedMedications);
    };

    // Extension state variables removed - simplified prescription system
    const extendMode = {};
    const extendMedication = {};
    const extensionEligibility = {};
    const checkingEligibility = {};
    const setExtendMode = (value: any) => { console.log('setExtendMode called with:', value); };
    const setExtendMedication = (value: any) => { console.log('setExtendMedication called with:', value); };
    const setExtensionEligibility = (value: any) => {};
    const setCheckingEligibility = (value: any) => {};
    const setExtensionMedicationName = (name: string) => {};
    const setExtensionModalOpen = (open: boolean) => {};

    // Check extension eligibility for a specific medication
    const checkExtensionEligibility = async (index: number, medicationName: string) => {
        if (!patient || !medicationName || !medicationName.trim()) {
            setExtensionEligibility(prev => ({ ...prev, [index]: false }));
            setCheckingEligibility(prev => ({ ...prev, [index]: false }));
            return;
        }

        setCheckingEligibility(prev => ({ ...prev, [index]: true }));

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            if (token) {
                console.log('🔍 Patient object:', patient);
                console.log('🔍 Patient _id:', patient._id);
                console.log('🔍 Patient patientId:', patient.patientId);
                
                const patientId = patient._id || patient.patientId;
                const eligibilityUrl = `/api/prescriptions/extension-eligibility/${patientId}/${encodeURIComponent(medicationName.trim())}`;
                console.log(`🔍 Checking extension eligibility for ${medicationName} (patient: ${patientId})`);
                
                const response = await fetch(eligibilityUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
                
                if (response.ok) {
                    const eligibilityData = await response.json();
                    console.log(`🔍 Extension eligibility result for ${medicationName}:`, eligibilityData);
                    setExtensionEligibility(prev => ({ ...prev, [index]: eligibilityData.eligible }));
                } else {
                    console.log(`❌ Failed to check extension eligibility for ${medicationName}:`, response.status);
                    setExtensionEligibility(prev => ({ ...prev, [index]: false }));
                }
            }
        } catch (error) {
            console.log('Failed to check extension eligibility:', error);
            setExtensionEligibility(prev => ({ ...prev, [index]: false }));
        } finally {
            setCheckingEligibility(prev => ({ ...prev, [index]: false }));
        }
    };

    const toggleExtendMode = async (index: number, medicationName: string) => {
        console.log('🔧 Toggle extend mode for medication:', medicationName, 'index:', index);
        console.log('🔧 Current extendMode state:', extendMode);
        
        if (!patient) {
            toast.error('Select a patient first');
            return;
        }
        if (!medicationName || !medicationName.trim()) {
            toast.error('Enter a medication name first');
            return;
        }
        
        const newExtendMode = { ...extendMode };
        const newExtendMedication = { ...extendMedication };
        
        if (newExtendMode[index]) {
            // Disable extend mode
            delete newExtendMode[index];
            delete newExtendMedication[index];
            toast.success('Extension mode disabled');
        } else {
            // Check if extension is eligible before enabling
            if (!extensionEligibility[index]) {
                toast.error(`Cannot extend ${medicationName.trim()}. This patient has no active prescription for this medication.`);
                return;
            }
            
            // Enable extend mode
            newExtendMode[index] = true;
            newExtendMedication[index] = medicationName.trim();
            toast.success(`✅ Extension mode enabled for ${medicationName.trim()}. Found existing prescription to extend.`);
        }
        
        setExtendMode(newExtendMode);
        setExtendMedication(newExtendMedication);
        
        console.log('🔧 Updated extend mode:', newExtendMode);
        console.log('🔧 Updated extend medication:', newExtendMedication);
    };
    
    const handleRefillsChange = (value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            setPrescription(prev => ({ ...prev, refills: numValue }));
            if (errors.refills) {
               const { refills, ...rest } = errors;
               setErrors(rest);
            }
        } else if (value === '') {
             setPrescription(prev => ({ ...prev, refills: 0 })); // Allow clearing
             if (errors.refills) {
               const { refills, ...rest } = errors;
               setErrors(rest);
            }
        }
    };

    // Check for drug interactions
    const checkDrugInteractions = (currentMedications: MedicationItem[]) => {
        const interactions: string[] = [];
        const medicationNames = currentMedications.map(med => 
            med.medication.toLowerCase().split(' ')[0] // Get base medication name
        );

        medicationNames.forEach((med1, index1) => {
            medicationNames.forEach((med2, index2) => {
                if (index1 !== index2) {
                    Object.entries(DRUG_INTERACTIONS).forEach(([drug, interactsWith]) => {
                        if (med1.includes(drug.toLowerCase()) && 
                            interactsWith.some(interaction => med2.includes(interaction.toLowerCase()))) {
                            const warningMsg = `${drug} may interact with ${med2}`;
                            if (!interactions.includes(warningMsg)) {
                                interactions.push(warningMsg);
                            }
                        }
                    });
                }
            });
        });

        setDrugInteractions(interactions);
        setShowInteractionWarning(interactions.length > 0);
    };

    // UseEffect to check interactions when medications change
    useEffect(() => {
        if (medications.length > 1) {
            checkDrugInteractions(medications);
        } else {
            setDrugInteractions([]);
            setShowInteractionWarning(false);
        }
    }, [medications]);

    // UseEffect to auto-calculate quantity when frequency or duration changes
    useEffect(() => {
        const updatedMedications = medications.map(med => {
            if (med.frequency && med.duration && med.inventoryItem) {
                const calculatedQuantity = calculateQuantity(med.frequency, med.duration);
                // Only update if quantity is not manually set or if it's different from calculated
                if (!med.quantity || med.quantity !== calculatedQuantity) {
                    return { ...med, quantity: calculatedQuantity };
                }
            }
            return med;
        });
        
        // Only update if there are changes to avoid infinite loops
        const hasChanges = updatedMedications.some((med, index) => 
            med.quantity !== medications[index].quantity
        );
        
        if (hasChanges) {
            setMedications(updatedMedications);
        }
    }, [medications.map(med => `${med.frequency}-${med.duration}`).join(',')]);

    // Keyboard shortcuts for improved workflow
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + M to add new medication
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                addMedication(medications.length);
            }
            
            // Ctrl/Cmd + Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const form = document.querySelector('form') as HTMLFormElement;
                if (form) {
                    form.requestSubmit();
                }
            }
            
            // Ctrl/Cmd + P to print
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                handlePrint();
            }
            
            // Escape to close
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [medications, onClose]);

    // Get most subscribed medications from inventory
    const getMostSubscribedFromInventory = () => {
        // Filter inventory items that are commonly prescribed and have good stock
        const commonInventoryMedications = availableInventoryMedications
            .filter(item => {
                const commonNames = [
                    'paracetamol', 'amoxicillin', 'ibuprofen', 'azithromycin', 'metformin',
                    'amlodipine', 'atorvastatin', 'omeprazole', 'lisinopril', 'tramadol',
                    'diclofenac', 'ciprofloxacin', 'cephalexin', 'doxycycline', 'aspirin'
                ];
                return commonNames.some(name => 
                    item.name.toLowerCase().includes(name) && item.quantity > 10
                );
            })
            .sort((a, b) => b.quantity - a.quantity) // Sort by stock quantity (highest first)
            .slice(0, 8); // Get top 8 most stocked common medications
        
        return commonInventoryMedications;
    };

    // Quick medication templates with mostly subscribed options
    const applyMedicationTemplate = (templateName: string, index: number) => {
        const templates = {
            'most-subscribed': {
                medication: 'Paracetamol 500mg',
                dosage: '500mg',
                frequency: 'Once daily (QD)',
                route: 'Oral',
                nurseInstructions: 'Take as directed',
                inventoryItemId: null,
                assignedNurseId: null
            },
            'inventory-top': {
                medication: getMostSubscribedFromInventory()[0]?.name || 'Paracetamol 500mg',
                dosage: getMostSubscribedFromInventory()[0]?.dosage || 'As directed',
                frequency: 'Once daily (QD)',
                route: getMostSubscribedFromInventory()[0]?.administrationRoute || 'Oral',
                nurseInstructions: 'Take as directed',
                inventoryItemId: getMostSubscribedFromInventory()[0]?._id || null,
                assignedNurseId: null
            },
            'pain-relief': {
                medication: 'Paracetamol 500mg',
                dosage: '500mg-1g every 4-6 hours as needed',
                frequency: 'Every 6 hours',
                route: 'Oral',
                nurseInstructions: 'Take with food if stomach upset occurs',
                inventoryItemId: null,
                assignedNurseId: null
            },
            'antibiotic': {
                medication: 'Amoxicillin 500mg',
                dosage: '500mg three times daily',
                frequency: 'Three times daily (TID)',
                route: 'Oral',
                nurseInstructions: 'Complete full course',
                inventoryItemId: null,
                assignedNurseId: null
            },
            'hypertension': {
                medication: 'Amlodipine 5mg',
                dosage: '5mg once daily',
                frequency: 'Once daily (QD)',
                route: 'Oral',
                nurseInstructions: 'Take same time daily',
                inventoryItemId: null,
                assignedNurseId: null
            }
        };

        const template = templates[templateName as keyof typeof templates];
        if (template) {
            const updatedMeds = [...medications];
            updatedMeds[index] = { ...updatedMeds[index], ...template };
            
            // Auto-calculate quantity for template if it has inventory item
            const matchedInventoryItem = availableInventoryMedications.find(
                item => item.name.toLowerCase() === template.medication.toLowerCase()
            );
            
            if (matchedInventoryItem) {
                updatedMeds[index].inventoryItemId = matchedInventoryItem._id;
                updatedMeds[index].inventoryItem = matchedInventoryItem;
                
                // Calculate quantity based on template frequency and medication duration (use default if not set)
                const duration = updatedMeds[index].duration || "7 days";
                updatedMeds[index].quantity = calculateQuantity(template.frequency, duration);
            }
            
            setMedications(updatedMeds);
        }
    };

    // Calculate quantity based on frequency and duration
    const calculateQuantity = (frequency: string, duration: string): number => {
        // Extract number of times per day from frequency
        let timesPerDay = 1;
        if (frequency.includes('Once') || frequency.includes('QD')) timesPerDay = 1;
        else if (frequency.includes('Twice') || frequency.includes('BID')) timesPerDay = 2;
        else if (frequency.includes('Three times') || frequency.includes('TID')) timesPerDay = 3;
        else if (frequency.includes('Four times') || frequency.includes('QID')) timesPerDay = 4;
        else if (frequency.includes('Every 4 hours')) timesPerDay = 6;
        else if (frequency.includes('Every 6 hours')) timesPerDay = 4;
        else if (frequency.includes('Every 8 hours')) timesPerDay = 3;
        else if (frequency.includes('Every 12 hours')) timesPerDay = 2;
        else if (frequency.includes('Weekly')) timesPerDay = 1/7;
        else if (frequency.includes('Twice weekly')) timesPerDay = 2/7;
        else if (frequency.includes('Every other day')) timesPerDay = 0.5;
        else if (frequency.includes('Monthly')) timesPerDay = 1/30;
        
        // Extract number of days from duration - FIXED for single day calculation
        let days = 1; // default to 1 day instead of 7
        const durationMatch = duration.match(/(\d+)/);
        if (durationMatch) {
            days = parseInt(durationMatch[1]);
            if (duration.toLowerCase().includes('month')) days *= 30;
            else if (duration.toLowerCase().includes('week')) days *= 7;
        }
        
        // Ensure minimum of 1 day for any prescription
        days = Math.max(1, days);
        
        const totalQuantity = timesPerDay * days;
        console.log(`🧮 [CALCULATION] ${frequency} × ${duration} = ${timesPerDay} doses/day × ${days} days = ${totalQuantity} total doses`);
        
        return Math.ceil(totalQuantity);
    };

    // Auto-suggest route and initial dosage when medication is selected
    const autoSuggestMedicationDefaults = (medicationName: string, index: number) => {
        setMedications(prevMeds => {
            const updatedMeds = [...prevMeds];
            
            // Ensure the medication name is preserved
            if (updatedMeds[index]) {
                // Priority 1: Use inventory item data if available
                if (updatedMeds[index].inventoryItem) {
                    const inventoryItem = updatedMeds[index].inventoryItem;
                    
                    // Set route from inventory if available and not already set
                    if (inventoryItem.administrationRoute && !updatedMeds[index].route) {
                        updatedMeds[index].route = inventoryItem.administrationRoute;
                    }
                    
                    // Set dosage from inventory if available and not already set
                    if (inventoryItem.dosage && !updatedMeds[index].dosage) {
                        updatedMeds[index].dosage = inventoryItem.dosage;
                    }
                }
                
                // Priority 2: Use predefined medication data if inventory data not available
                if (!updatedMeds[index].route) {
                    const suggestedRoute = Object.entries(MEDICATION_ROUTE_SUGGESTIONS).find(([key]) => 
                        medicationName.toLowerCase().includes(key.toLowerCase())
                    )?.[1] || "Oral";
                    updatedMeds[index].route = suggestedRoute;
                }
                
                if (!updatedMeds[index].dosage) {
                    const medicationDosages = MEDICATION_DOSAGES[medicationName];
                    const suggestedDosage = medicationDosages?.[0] || "";
                    if (suggestedDosage) {
                        updatedMeds[index].dosage = suggestedDosage;
                    }
                }
                
                // Set default frequency if not set
                if (!updatedMeds[index].frequency || updatedMeds[index].frequency === 'Once daily (QD)') {
                    updatedMeds[index].frequency = "Once daily (QD)";
                }
                
                // Calculate quantity if medication has inventory item and duration
                if (updatedMeds[index].inventoryItem && updatedMeds[index].duration) {
                    const frequency = updatedMeds[index].frequency || "Once daily (QD)";
                    const duration = updatedMeds[index].duration;
                    updatedMeds[index].quantity = calculateQuantity(frequency, duration);
                }
            }
            
            return updatedMeds;
        });
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        // Validate items (medications + services)
        medications.forEach((med, index) => {
            if (med.medicationType === 'service') {
                if (!med.medication || med.medication.trim() === '') {
                    newErrors[`medications[${index}].medication`] = 'Service name is required';
                }
                if (!med.serviceId) {
                    newErrors[`medications[${index}].serviceId`] = 'Please select a clinic service from the list';
                }
                const qty = Number(med.quantity || 1);
                if (!Number.isFinite(qty) || qty < 1) {
                    newErrors[`medications[${index}].quantity`] = 'Quantity must be at least 1';
                }
                return;
            }

            // Medication name validation
            if (!med.medication || med.medication.trim() === '') {
                newErrors[`medications[${index}].medication`] = 'Medication name is required';
            }

            // Dosage validation
            if (!med.dosage || med.dosage.trim() === '') {
                newErrors[`medications[${index}].dosage`] = 'Dosage is required';
            }

            // Frequency validation
            if (!med.frequency || med.frequency.trim() === '') {
                newErrors[`medications[${index}].frequency`] = 'Frequency is required';
            }
        
            // Duration validation
            if (!med.duration || med.duration.trim() === '') {
                newErrors[`medications[${index}].duration`] = 'Duration is required';
            }

            // Route validation
            if (!med.route || med.route.trim() === '') {
                newErrors[`medications[${index}].route`] = 'Route is required';
            }
        });

        // Global nurse validation - REQUIRED when sendAllToNurse is true (and there are medication items)
        const hasMedicationItems = medications.some(m => m.medicationType !== 'service');
        if (sendAllToNurse && hasMedicationItems && (!globalNurseId || globalNurseId === 'none' || globalNurseId.trim() === '')) {
            newErrors.globalNurseId = 'Nurse assignment is required when sending all medications to nurse dashboard';
        }

        // Refills validation
        if (prescription.refills === undefined || prescription.refills === null) {
            newErrors.refills = 'Refills are required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationResult = validateForm();
        
        if (!validationResult) {
            // Show toast notification for validation errors
            const errorMessages = Object.values(errors);
            if (errorMessages.length > 0) {
                toast.error(`Please fix the following errors: ${errorMessages.join(', ')}`);
            } else {
                toast.error('Please fill in all required fields');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            // Extension mode disabled - simplified prescription system
            const extendingMedications: never[] = [];
            
            if (false) { // Extension mode always disabled
                // Handle extension mode
                console.log('🔧 Processing extension mode for medications:', extendingMedications);
                console.log('🔧 [EXTENSION DEBUG] extendMode keys:', Object.keys(extendMode));
                console.log('🔧 [EXTENSION DEBUG] extendMode values:', extendMode);
                console.log('🔧 [EXTENSION DEBUG] extendMedication values:', extendMedication);
                console.log('🔧 [EXTENSION DEBUG] extendingMedications array:', extendingMedications);
                console.log('🔧 [EXTENSION DEBUG] medications array length:', medications.length);
                console.log('🔧 [EXTENSION DEBUG] medications array:', medications);
                
                let extensionSuccess = false;
                
                for (const index of extendingMedications) {
                    const medicationName = extendMedication[index];
                    const duration = medications[index]?.duration;
                    const frequency = medications[index]?.frequency; // ROOT CAUSE FIX: Get the selected frequency
                    
                    console.log(`🔧 [EXTENSION LOOP] Processing index ${index}:`);
                    console.log(`🔧 [EXTENSION LOOP] medicationName: ${medicationName}`);
                    console.log(`🔧 [EXTENSION LOOP] duration: ${duration} (type: ${typeof duration})`);
                    console.log(`🔧 [EXTENSION LOOP] frequency: ${frequency} (type: ${typeof frequency})`);
                    console.log(`🔧 [EXTENSION LOOP] medications[${index}]:`, medications[index]);
                    
                    if (medicationName && duration) {
                        // Extract number of days from duration - handle various formats
                        let additionalDays = 1; // Default to 1 day
                        
                        console.log(`🔧 [DURATION DEBUG] Processing duration: "${duration}" (type: ${typeof duration})`);
                        
                        if (typeof duration === 'string') {
                            // Try to extract number from string (e.g., "3 days", "5", "2 weeks")
                            const daysMatch = duration.match(/(\d+)/);
                            console.log(`🔧 [DURATION DEBUG] Regex match result:`, daysMatch);
                            if (daysMatch) {
                                additionalDays = parseInt(daysMatch[1]);
                                console.log(`🔧 [DURATION DEBUG] Parsed additionalDays: ${additionalDays}`);
                            }
                        } else if (typeof duration === 'number') {
                            // If duration is already a number
                            additionalDays = Number(duration);
                            console.log(`🔧 [DURATION DEBUG] Duration is number: ${additionalDays}`);
                        }
                        
                        // Ensure minimum of 1 day
                        additionalDays = Math.max(1, additionalDays);
                        
                        console.log(`🔧 [DURATION DEBUG] Final additionalDays: ${additionalDays} (type: ${typeof additionalDays})`);
                        console.log(`🔧 Extending ${medicationName} by ${additionalDays} days (from duration: "${duration}")`);
                        
                        // Call the extension API
                        try {
                            // Get the auth token from localStorage
                            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                            console.log('🔧 Extension API - Token available:', !!token);
                            console.log('🔧 Extension API - Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
                            
                            if (!token) {
                                toast.error('❌ Authentication required. Please log in again.');
                                return;
                            }

                            const eligibilityUrl = `/api/prescriptions/extension-eligibility/${patient._id || patient.patientId}/${encodeURIComponent(medicationName)}`;
                            console.log('🔧 Extension API - Checking eligibility:', eligibilityUrl);
                            
                            const response = await fetch(eligibilityUrl, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                }
                            });
                            
                            console.log('🔧 Extension API - Eligibility response status:', response.status);
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.error('🔧 Extension API - Eligibility error:', errorText);
                                toast.error(`❌ Eligibility check failed: ${response.status} ${response.statusText}`);
                                return;
                            }
                            
                            const eligibilityData = await response.json();
                            console.log('🔧 Extension API - Eligibility data:', eligibilityData);
                            
                            if (eligibilityData.eligible && eligibilityData.data?.prescriptionId) {
                                const extendUrl = `/api/prescriptions/extend/${eligibilityData.data.prescriptionId}`;
                                console.log('🔧 Extension API - Extending prescription:', extendUrl);
                                
                                // ROOT CAUSE FIX: Use the selected frequency from the form, fallback to original prescription frequency
                                const selectedFrequency = frequency || eligibilityData.data.frequency || 'BID (twice daily)';
                                console.log('🔧 Extension API - Using selected frequency:', selectedFrequency);
                                console.log('🔧 Extension API - Form frequency:', frequency);
                                console.log('🔧 Extension API - Original prescription frequency:', eligibilityData.data.frequency);
                                
                                const requestBody = {
                                    additionalDays: additionalDays,
                                    reason: `Doctor extended prescription via form for ${patient.firstName} ${patient.lastName}`,
                                    frequency: selectedFrequency // ROOT CAUSE FIX: Use selected frequency from form
                                };
                                
                                console.log('🔧 Extension API - Request body:', requestBody);
                                console.log('🔧 Extension API - additionalDays value:', additionalDays, 'type:', typeof additionalDays);
                                console.log('🔧 Extension API - Request body JSON:', JSON.stringify(requestBody));
                                
                                const extendResponse = await fetch(extendUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(requestBody),
                                });
                                
                                console.log('🔧 Extension API - Extend response status:', extendResponse.status);
                                
                                if (!extendResponse.ok) {
                                    const errorText = await extendResponse.text();
                                    console.error('🔧 Extension API - Extend error:', errorText);
                                    toast.error(`❌ Extension failed: ${extendResponse.status} ${extendResponse.statusText}`);
                                    return;
                                }
                                
                                const extendData = await extendResponse.json();
                                console.log('🔧 Extension API - Extend data:', extendData);
                                
                                if (extendData.success) {
                                    toast.success(`✅ Extended ${medicationName} for ${patient.firstName} ${patient.lastName} by ${additionalDays} days. Payment notification sent to reception.`);
                                    console.log('🔧 Extension successful, will exit form');
                                    extensionSuccess = true;
                                } else {
                                    toast.error(`❌ Failed to extend ${medicationName}: ${extendData.message}`);
                                    console.log('🔧 Extension failed, will continue with regular flow');
                                }
                            } else {
                                toast.error(`❌ Cannot extend ${medicationName}: ${eligibilityData.message || 'This patient has no existing prescription for this medication'}`);
                            }
                        } catch (extendError) {
                            console.error('🔧 Extension API - Network error:', extendError);
                            toast.error(`❌ Network error extending ${medicationName}`);
                        }
                    }
                }
                
                // Clear extension mode
                setExtendMode({});
                setExtendMedication({});
                
                // Close the form only if at least one extension succeeded
                if (extensionSuccess) {
                    console.log('🔧 At least one extension succeeded, closing form');
                    onClose();
                    return;
                } else {
                    console.log('🔧 No extensions succeeded, continuing with regular prescription creation');
                }
            }
            
            // Regular prescription creation (existing logic)
            // Separate inventory medications (need payment) from external prescriptions (print only)
            const serviceItems = medications.filter(med => med.medicationType === 'service' && med.serviceId);
            const medicationItems = medications.filter(med => med.medicationType !== 'service');
            const inventoryMedications = medicationItems.filter(med => med.medicationType === 'inventory' && med.inventoryItemId && med.inventoryItem);
            const externalPrescriptions = medicationItems.filter(med => med.medicationType === 'external' || (!med.inventoryItemId || !med.inventoryItem));
            
            // Apply global nurse assignment to all medications if enabled
            const medicationsWithGlobalNurse = medicationItems.map(med => ({
                ...med,
                sendToNurse: sendAllToNurse,
                assignedNurseId: sendAllToNurse ? globalNurseId : null
            }));

            // CRITICAL FIX: Debug and ensure individual durations are preserved
            console.log('🔧 [CRITICAL FIX] Original medications array:', medications.map(med => ({ 
                name: med.medication, 
                duration: med.duration,
                frequency: med.frequency 
            })));
            console.log('🔧 [CRITICAL FIX] Full medications array with all fields:', medications);
            console.log('🔧 [CRITICAL FIX] Current form state - medications:', medications);
            console.log('🔧 [CRITICAL FIX] Current form state - prescription:', prescription);
            
            // Prepare final data to send with required fields explicitly defined
            const finalPrescription = {
                ...prescription,
                // Add doctor ID from auth context
                doctorId: user?.id || user?._id,
                patient: patient?.id || patient?._id,
                // Remove global duration - use individual medication durations instead
                medications: medicationsWithGlobalNurse.map((med, index) => {
                    const individualDuration = med.duration; // CRITICAL: Always use doctor's prescribed duration, no defaults
                    console.log(`🔧 [CRITICAL FIX] Medication ${index}: ${med.medication} - duration: "${individualDuration}"`);
                    
                    return {
                        ...med,
                        medicationName: med.medication, // Ensure both fields are set
                        medicationType: med.medicationType, // Include medication type
                        inventoryItemId: med.inventoryItemId || null, // Backend expects this field name
                        duration: individualDuration, // CRITICAL: Use exact doctor's prescribed duration
                        route: med.route || "Oral",
                        nurseInstructions: med.nurseInstructions || "",
                        sendToNurse: med.sendToNurse || false,
                        assignedNurseId: med.assignedNurseId || null, // Keep as null, don't convert to empty string
                        isFromInventory: med.medicationType === 'inventory' && !!(med.inventoryItemId && med.inventoryItem), // Flag for payment processing
                        requiresPayment: med.medicationType === 'inventory' && !!(med.inventoryItemId && med.inventoryItem), // Explicit payment flag
                    };
                }),
                refills: prescription.refills || 0,
                instructions: prescription.instructions || "",
                notes: prescription.instructions || "", // Duplicate to notes for backward compatibility
                visitId: patient?.visitId || "000000000000000000000000",
                hasInventoryItems: inventoryMedications.length > 0, // Flag for reception
                hasExternalPrescriptions: externalPrescriptions.length > 0, // Flag for printing
                inventoryMedicationsCount: inventoryMedications.length,
                externalPrescriptionsCount: externalPrescriptions.length
            };

            const totalMedications = medicationItems.length;
            const hasInventory = inventoryMedications.length > 0;
            const hasExternal = externalPrescriptions.length > 0;
            
            let message = `Prescription created successfully with ${totalMedications} medication(s)`;
            if (hasInventory && hasExternal) {
                message += ` - ${inventoryMedications.length} for payment, ${externalPrescriptions.length} for printing`;
            } else if (hasInventory) {
                message += ` - sent to reception for payment`;
            } else if (hasExternal) {
                message += ` - ready for printing`;
            }
            
            // CRITICAL FIX: Debug final prescription before sending
            console.log('🔧 [CRITICAL FIX] Final prescription being sent:', JSON.stringify(finalPrescription, null, 2));
            console.log('🔧 [CRITICAL FIX] Doctor ID included:', finalPrescription.doctorId);
            console.log('🔧 [CRITICAL FIX] Patient ID included:', finalPrescription.patient);
            console.log('🔧 [CRITICAL FIX] Final medications with durations:', finalPrescription.medications.map(med => ({ 
                name: med.medication, 
                duration: med.duration,
                frequency: med.frequency 
            })));
            
            await onSubmit(finalPrescription); // Call the passed onSubmit handler

            // Create service requests (if selected)
            if (serviceItems.length > 0) {
                const patientId = (patient as any)?.id || (patient as any)?._id;
                const results = await Promise.allSettled(
                    serviceItems.map((svc) =>
                        serviceRequestService.createServiceRequest({
                            patient: patientId,
                            service: svc.serviceId as string,
                            notes: svc.serviceNotes || `Service ordered during prescription by Dr. ${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                            status: 'pending',
                            quantity: Math.max(1, Number(svc.quantity || 1)),
                            source: 'doctor'
                        })
                    )
                );
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length > 0) {
                    toast.error(`Prescription saved, but ${failed.length} service request(s) failed to send. Please retry.`);
                }
            }

            if (serviceItems.length > 0) {
                message += ` • ${serviceItems.length} service(s) sent`;
            }
            toast.success(message);
            
            onClose(); // Close dialog on successful submission
        } catch (error: any) {
            console.error("Error submitting prescription:", error);

            // Check for duplicate prescription error in the response structure
            let errorText = '';
            
            if (error?.response?.data?.error) {
                errorText = error.response.data.error;
            } else if (error?.response?.data?.details && Array.isArray(error.response.data.details)) {
                errorText = error.response.data.details.join(' ');
            } else if (error?.message) {
                errorText = error.message;
            }

            // Check if this is a duplicate prescription error
            const duplicateMatch = errorText.match(/Active prescription for\s+(.+?)\s+already exists/i);
            
            if (duplicateMatch && duplicateMatch[1]) {
                const medName = duplicateMatch[1];
                setExtensionMedicationName(medName);
                setExtensionModalOpen(true);
                toast.error(`Active ${medName} exists. Use Extend to add days or try again - the backend should automatically extend existing prescriptions.`);
            } else {
                // Show generic error for other issues
                toast.error(`Prescription creation failed: ${errorText}`);
            }
            // Don't close dialog so user can fix and retry
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this website to print prescriptions');
            return;
        }

        // Format current date
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

                 // Generate medication list HTML - Extra large font medical prescription format
         const generateMedicationListHtml = () => {
             const medsForPrint = medications
                 .filter(med => med.medicationType !== 'service')
                 .filter(med => med.medication && med.medication.trim());
             return medsForPrint.map((med, index) => {
                 const isExternal = !med.inventoryItemId;
                 return `
                     <div class="medication-item" style="margin-bottom: 6px; padding: 5px; page-break-inside: avoid; border-bottom: 2px solid #ccc;">
                         <div style="display: flex; align-items: center; margin-bottom: 4px;">
                             <div class="med-num" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #666; color: white; border-radius: 50%; font-size: 11px; font-weight: bold; margin-right: 8px;">${index + 1}</div>
                             <div style="flex: 1;">
                                 <div style="display: flex; align-items: center; gap: 6px;">
                                     <strong style="font-size: 14px; color: #333; font-family: Arial, sans-serif;">${med.medication}</strong>
                                     ${isExternal ? '<span class="med-badge" style="background: #666; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;">Ext</span>' : '<span class="med-badge" style="background: #999; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;">In</span>'}
                                 </div>
                             </div>
                         </div>
                         
                         <div style="margin-left: 28px;">
                             <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 6px; margin-bottom: 4px;">
                                 <div style="padding: 4px 5px;">
                                     <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Dose</span>
                                     <div style="font-size: 12px; color: #333; font-weight: 500;">${med.dosage || 'As directed'}</div>
                                 </div>
                                 <div style="padding: 4px 5px;">
                                     <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Freq</span>
                                     <div style="font-size: 12px; color: #333; font-weight: 500;">${med.frequency || 'As needed'}</div>
                                 </div>
                                 ${med.duration ? `
                                     <div style="padding: 4px 5px;">
                                         <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Duration</span>
                                         <div style="font-size: 12px; color: #333; font-weight: 500;">${med.duration}</div>
                                     </div>
                                 ` : ''}
                                 ${med.route ? `
                                     <div style="padding: 4px 5px;">
                                         <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Route</span>
                                         <div style="font-size: 12px; color: #333; font-weight: 500;">${med.route}</div>
                                     </div>
                                 ` : ''}
                                 ${med.quantity ? `
                                     <div style="padding: 4px 5px;">
                                         <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Qty</span>
                                         <div style="font-size: 12px; color: #333; font-weight: 500;">${med.quantity}</div>
                                     </div>
                                 ` : ''}
                             </div>
                             
                             ${med.nurseInstructions ? `
                                 <div style="background: #f8f8f8; padding: 5px; margin-top: 4px; border-left: 2px solid #ccc;">
                                     <div style="font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Instructions</div>
                                     <div style="font-size: 11px; color: #333; line-height: 1.5; font-style: italic;">${med.nurseInstructions}</div>
                                 </div>
                             ` : ''}
                         </div>
                     </div>
                 `;
             }).join('');
         };

         const generateServiceListHtml = () => {
             const servicesForPrint = medications
                 .filter(med => med.medicationType === 'service')
                 .filter(med => (med.serviceId || med.medication) && (med.medication || '').trim());
             if (servicesForPrint.length === 0) return '';

             return `
                 <div style="margin-top: 12px;">
                     <div class="prescription-title">🩺 Services</div>
                     <div class="medications-list">
                         ${servicesForPrint.map((svc, i) => {
                             const unitPrice = Number((svc.service as any)?.price || 0);
                             const qty = Math.max(1, Number(svc.quantity || 1));
                             const total = unitPrice * qty;
                             const category = (svc.service as any)?.category || '';
                             return `
                                 <div class="medication-item" style="margin-bottom: 6px; padding: 5px; page-break-inside: avoid; border-bottom: 2px solid #ccc;">
                                     <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                         <div class="med-num" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #666; color: white; border-radius: 50%; font-size: 11px; font-weight: bold; margin-right: 8px;">${i + 1}</div>
                                         <div style="flex: 1;">
                                             <div style="display: flex; align-items: center; gap: 6px;">
                                                 <strong style="font-size: 14px; color: #333; font-family: Arial, sans-serif;">${svc.medication}</strong>
                                                 <span class="med-badge" style="background: #999; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;">Svc</span>
                                             </div>
                                         </div>
                                     </div>
                                     <div style="margin-left: 28px;">
                                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 6px; margin-bottom: 4px;">
                                             ${category ? `
                                                 <div style="padding: 4px 5px;">
                                                     <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Category</span>
                                                     <div style="font-size: 12px; color: #333; font-weight: 500;">${category}</div>
                                                 </div>
                                             ` : ''}
                                             <div style="padding: 4px 5px;">
                                                 <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Qty</span>
                                                 <div style="font-size: 12px; color: #333; font-weight: 500;">${qty}</div>
                                             </div>
                                             ${unitPrice ? `
                                                 <div style="padding: 4px 5px;">
                                                     <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Unit</span>
                                                     <div style="font-size: 12px; color: #333; font-weight: 500;">ETB ${unitPrice.toFixed(2)}</div>
                                                 </div>
                                             ` : ''}
                                             ${unitPrice ? `
                                                 <div style="padding: 4px 5px;">
                                                     <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600;">Total</span>
                                                     <div style="font-size: 12px; color: #333; font-weight: 500;">ETB ${total.toFixed(2)}</div>
                                                 </div>
                                             ` : ''}
                                         </div>
                                         ${svc.serviceNotes ? `
                                             <div style="background: #f8f8f8; padding: 5px; margin-top: 4px; border-left: 2px solid #ccc;">
                                                 <div style="font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Notes</div>
                                                 <div style="font-size: 11px; color: #333; line-height: 1.5; font-style: italic;">${svc.serviceNotes}</div>
                                             </div>
                                         ` : ''}
                                     </div>
                                 </div>
                             `;
                         }).join('')}
                     </div>
                 </div>
             `;
         };

        // Create the prescription HTML
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Prescription - ${patient.firstName} ${patient.lastName}</title>
                                         <style>
                        @page {
                            size: A5 portrait;
                            margin: 5mm;
                        }
                        
                        * {
                            box-sizing: border-box;
                        }
                        
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0;
                            padding: 0; 
                            color: #333;
                            font-size: 15px;
                            line-height: 1.5;
                            background: white;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                        
                        .prescription-container {
                            width: 100%;
                            max-width: 100%;
                            margin: 0;
                            background: white;
                            box-shadow: none;
                            border-radius: 0;
                            border: 3px solid #333;
                            overflow: hidden;
                            position: relative;
                            min-height: 200mm;
                            padding: 14px;
                        }
                         
                        .prescription-container::before {
                            display: none;
                        }
                        
                        .prescription-container > * {
                            position: relative;
                            z-index: 2;
                        }
                        
                        .prescription-header {
                            background: #f8f8f8;
                            color: #333333;
                            padding: 10px 12px;
                            position: relative;
                            overflow: hidden;
                            border-bottom: 3px solid #333;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin-bottom: 12px;
                        }
                        
                        .prescription-header::before {
                            display: none;
                        }
                        
                        .clinic-info {
                            position: relative;
                            z-index: 2;
                            display: flex;
                            align-items: center;
                            flex-direction: row;
                            gap: 14px;
                        }
                        
                        .clinic-logo {
                            width: 60px;
                            height: 60px;
                            border-radius: 4px;
                            border: 1px solid #ccc;
                            flex-shrink: 0;
                        }
                        
                        .clinic-name {
                            font-size: 18px;
                            font-weight: bold;
                            color: #333;
                            margin-bottom: 5px;
                        }
                        
                        .clinic-subtitle {
                            font-size: 15px;
                            color: #666;
                            margin-bottom: 4px;
                            font-weight: 600;
                        }
                        
                        .clinic-address, .clinic-phone {
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 0;
                            display: flex;
                            align-items: center;
                            gap: 2px;
                        }
                        
                        .prescription-meta {
                            text-align: right;
                            font-size: 12px;
                            color: #333;
                            background: #f5f5f5;
                             padding: 4px 6px;
                             border-radius: 4px;
                             border: 1px solid #cccccc;
                         }
                         
                         .patient-section {
                             padding: 6px 8px;
                             margin: 5px 8px;
                         }
                         
                         .patient-title {
                             font-size: 12px;
                             font-weight: bold;
                             color: #333333;
                             margin-bottom: 4px;
                             display: flex;
                             align-items: center;
                             gap: 4px;
                             border-bottom: 1px solid #cccccc;
                             padding-bottom: 2px;
                         }
                         
                         .patient-info {
                             display: grid;
                             grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                             gap: 3px;
                             font-size: 10px;
                         }
                         
                         .info-item {
                             display: flex;
                             align-items: center;
                             padding: 3px 4px;
                         }
                         
                         .info-label {
                             font-weight: 600;
                             min-width: 50px;
                             color: #666666;
                             text-transform: uppercase;
                             font-size: 9px;
                             letter-spacing: 0.2px;
                         }
                         
                         .info-value {
                             color: #333333;
                             font-weight: 500;
                         }
                         
                         .prescription-title {
                             font-size: 12px;
                             font-weight: bold;
                             color: #333333;
                             margin: 8px 8px 5px 8px;
                             padding: 4px 6px;
                             border-bottom: 1px solid #cccccc;
                             display: flex;
                             align-items: center;
                             gap: 4px;
                         }
                         
                         .medications-list {
                             padding: 0 8px;
                         }
                         
                         .medication-item {
                             page-break-inside: avoid;
                             margin-bottom: 4px;
                         }
                         
                         .doctor-signature {
                             margin: 8px 8px 5px 8px;
                             padding: 6px 8px;
                             display: flex;
                             justify-content: space-between;
                             align-items: flex-end;
                             border-top: 1px solid #cccccc;
                         }
                         
                         .signature-block {
                             text-align: center;
                         }
                         
                         .signature-line {
                             border-bottom: 1px solid #333333;
                             width: 80px;
                             margin-bottom: 2px;
                             height: 20px;
                         }
                         
                         .signature-label {
                             font-size: 9px;
                             color: #666666;
                             font-weight: 600;
                             text-transform: uppercase;
                             letter-spacing: 0.2px;
                         }
                         
                         .doctor-info {
                             text-align: right;
                             padding: 4px 6px;
                         }
                         
                         .doctor-info div {
                             margin-bottom: 1px;
                             font-size: 9px;
                         }
                         
                         .doctor-info strong {
                             color: #333333;
                             font-weight: 600;
                         }
                         
                         .footer {
                             margin: 5px 8px 5px 8px;
                             padding: 6px 8px;
                             background: #f8f8f8;
                             border-top: 1px solid #cccccc;
                             color: #333333;
                             text-align: center;
                         }
                         
                         .footer div {
                             margin-bottom: 1px;
                             font-size: 9px;
                         }
                         
                         .footer div:first-child {
                             font-weight: 600;
                             font-size: 10px;
                             margin-bottom: 2px;
                         }
                         
                         .print-btn {
                             padding: 12px 24px;
                             background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                             color: white;
                             border: none;
                             border-radius: 8px;
                             font-size: 14px;
                             font-weight: 600;
                             cursor: pointer;
                             margin: 20px auto;
                             display: block;
                             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                             transition: all 0.3s ease;
                         }
                         
                         .print-btn:hover {
                             transform: translateY(-2px);
                             box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                         }
                         
                         @media print {
                             @page {
                                 size: A4;
                                 margin: 3mm 5mm;
                             }
                             
                             * {
                                 color: black !important;
                                 border-color: black !important;
                             }
                             
                             body { 
                                 margin: 0; 
                                 padding: 0;
                                 font-size: 9px;
                                 color: black !important;
                                 background: white !important;
                                 max-height: 14.8cm;
                                 overflow: hidden;
                                 -webkit-print-color-adjust: exact;
                                 print-color-adjust: exact;
                             }
                             
                             .prescription-container {
                                 box-shadow: none;
                                 border-radius: 0;
                                 max-width: none;
                                 height: 14.8cm;
                                 overflow: hidden;
                                 border-color: black !important;
                             }
                             
                             .prescription-container::before {
                                 content: 'ORIGINAL';
                                 position: absolute;
                                 top: 50%;
                                 left: 50%;
                                 transform: translate(-50%, -50%) rotate(-45deg);
                                 font-size: 36px;
                                 font-weight: bold;
                                 color: rgba(0, 0, 0, 0.06) !important;
                                 z-index: 1;
                                 pointer-events: none;
                                 letter-spacing: 6px;
                             }
                             
                             .prescription-header {
                                 background: white !important;
                                 color: black !important;
                                 border-bottom-color: black !important;
                                 -webkit-print-color-adjust: exact !important;
                                 color-adjust: exact !important;
                             }
                             
                             .patient-section {
                                 background: transparent !important;
                                 border: none !important;
                             }
                             
                             .prescription-title {
                                 background: transparent !important;
                                 color: black !important;
                                 border-bottom-color: black !important;
                             }
                             
                             .clinic-name, .clinic-subtitle, .clinic-address, .clinic-phone {
                                 color: black !important;
                             }
                             
                             .prescription-meta {
                                 background: white !important;
                                 color: black !important;
                                 border-color: black !important;
                             }
                             
                             .info-label, .info-value, .patient-title {
                                 color: black !important;
                             }
                             
                             .doctor-signature {
                                 background: transparent !important;
                                 border: none !important;
                                 border-top: 1px solid black !important;
                             }
                             
                             .doctor-signature, .doctor-info strong, .signature-label {
                                 color: black !important;
                             }
                             
                             .footer {
                                 background: white !important;
                                 color: black !important;
                                 border-top-color: black !important;
                             }
                             
                             .med-num, .med-badge {
                                 background: white !important;
                                 color: black !important;
                                 border: 1px solid black !important;
                             }
                             
                             [style*="background: #f8f8f8"] {
                                 background: white !important;
                                 border-left-color: black !important;
                             }
                             
                             .print-btn { 
                                 display: none !important; 
                             }
                             
                             .no-print { 
                                 display: none !important; 
                             }
                             
                             * { 
                                 -webkit-print-color-adjust: exact !important; 
                                 color-adjust: exact !important; 
                             }
                             
                             /* Ensure proper page breaks */
                             .medication-item {
                                 page-break-inside: avoid !important;
                             }
                             
                             /* Hide watermark on print if needed */
                             @media print and (max-width: 800px) {
                                 .prescription-container::before {
                                     display: none !important;
                                 }
                             }
                         }
                    </style>
                                 </head>
                 <body>
                     <div class="prescription-container">
                         <div class="prescription-header">
                             <div class="clinic-info">
                                 <img src="/assets/images/logo.jpg" alt="Clinic Logo" class="clinic-logo" onerror="this.style.display='none'">
                                 <div style="display: flex; flex-direction: column; justify-content: center;">
                                     <div class="clinic-name">New Life Medium Clinic PLC</div>
                                     <div class="clinic-subtitle">Medical Prescription</div>
                                     <div class="clinic-address">📍 Lafto beside Kebron Guest House</div>
                                     <div class="clinic-phone">📞 +251925959219</div>
                                 </div>
                             </div>
                             <div class="prescription-meta">
                                 <div><strong>Date:</strong> ${currentDate}</div>
                                 <div><strong>Status:</strong> Active</div>
                                 <div><strong>ID:</strong> ${Date.now().toString().slice(-6)}</div>
                             </div>
                         </div>

                         <div class="patient-section">
                             <div class="patient-title">
                                 👤 Patient Information
                             </div>
                             <div class="patient-info">
                                 <div class="info-item">
                                     <span class="info-label">Full Name:</span>
                                     <span class="info-value">${patient.firstName} ${patient.lastName}</span>
                                 </div>
                                 <div class="info-item">
                                     <span class="info-label">Age:</span>
                                     <span class="info-value">${patient.age || 'Not specified'} years</span>
                                 </div>
                                 <div class="info-item">
                                     <span class="info-label">Gender:</span>
                                     <span class="info-value">${patient.gender || 'Not specified'}</span>
                                 </div>
                                 <div class="info-item">
                                     <span class="info-label">Patient ID:</span>
                                     <span class="info-value">${patient.patientId || patient._id}</span>
                                 </div>
                                 ${patient.phoneNumber ? `
                                     <div class="info-item">
                                         <span class="info-label">Phone:</span>
                                         <span class="info-value">${patient.phoneNumber}</span>
                                     </div>
                                 ` : ''}
                                ${patient.address ? `
                                    <div class="info-item">
                                        <span class="info-label">Address:</span>
                                        <span class="info-value">${patient.address}</span>
                                    </div>
                                ` : ''}
                                <div class="info-item" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 15px;">
                                    <span class="info-label">Patient Type:</span>
                                    <label style="display: flex; align-items: center; gap: 5px;">
                                        <input type="checkbox" style="width: 14px; height: 14px; border: 1px solid #333;">
                                        <span>In-patient</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 5px;">
                                        <input type="checkbox" style="width: 14px; height: 14px; border: 1px solid #333;">
                                        <span>Out-patient</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                         <div class="prescription-title">
                             💊 Prescription Details
                         </div>

                        <div class="medications-list">
                            ${generateMedicationListHtml()}
                        </div>

                        ${generateServiceListHtml()}

                        <div class="doctor-signature" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333; align-items: start;">
                            <div class="signature-block">
                                <div style="margin-bottom: 8px;"><strong>DOCTOR SIGNATURE</strong></div>
                                <div style="font-size: 10px;"><strong>Prescriber:</strong> ${doctorName}</div>
                                <div style="font-size: 10px;"><strong>License:</strong> ${doctorLicense}</div>
                                <div style="font-size: 10px;"><strong>Date:</strong> ${currentDate}</div>
                                <div style="font-size: 10px; margin-top: 5px;"><strong>Signature:</strong> _______________________________________</div>
                            </div>
                            <div class="dispenser-block">
                                <div style="margin-bottom: 8px;"><strong>DISPENSER</strong></div>
                                <div style="font-size: 10px;"><strong>Full Name:</strong> _______________________________________</div>
                                <div style="font-size: 10px; margin-top: 5px;"><strong>Signature:</strong> _______________________________________</div>
                            </div>
                        </div>

                         <div class="footer">
                             <div>New Life Medium Clinic PLC - Medical Prescription System</div>
                             <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
                             <div>This prescription is valid for 30 days from the date of issue</div>
                         </div>
                     </div>

                     <button class="print-btn no-print" onclick="window.print()">🖨️ Print Prescription</button>

                    <script>
                        // Auto-focus on print button
                        document.addEventListener('DOMContentLoaded', function() {
                            document.querySelector('.print-btn').focus();
                        });
                        
                        // Handle print events
                        window.addEventListener('afterprint', function() {
                            console.log('Prescription printed successfully');
                        });
                    </script>
                </body>
            </html>
        `);

        // Close the document to finish writing
        printWindow.document.close();
        
        // Focus the new window
        printWindow.focus();
    };

    // Get doctor details - replace with actual data from user context
    const doctorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Dr. Unknown';
    const doctorLicense = (user as any)?.licenseNumber || 'N/A'; // Example: Adjust based on your AuthContext structure
    const currentDate = format(new Date(), 'MMMM dd, yyyy');

    if (!patient) {
        return (
            <div className="flex items-center justify-center h-64 bg-primary-foreground rounded-lg shadow-lg">
                <div className="text-center">
                    <div className="text-muted-foreground/50 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <p className="text-muted-foreground">No patient selected</p>
                    <Button onClick={onClose} className="mt-4">Close</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full bg-background h-full">
            {/* Main Content Container */}
            <div 
                className="flex-1 overflow-y-auto"
                style={{
                    maxHeight: '100vh',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <div ref={printRef} className="min-h-full p-4 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={LOGO_PATH}
                                alt="Clinic Logo"
                                className="w-10 h-10 rounded-full object-cover border border-border"
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = LOGO_FALLBACK;
                                }}
                            />
                            <div>
                                <h1 className="text-base font-semibold text-foreground leading-tight">New Life Medium Clinic PLC</h1>
                                <p className="text-xs text-muted-foreground">Create Prescription</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handlePrint} variant="outline" size="sm" className="h-8 text-xs">
                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                Print
                            </Button>
                            <Button onClick={onClose} variant="outline" size="sm" className="h-8 text-xs">
                                Close
                            </Button>
                        </div>
                    </div>

                    {/* Prescriber + Patient info bar */}
                    <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Prescriber</p>
                            <p className="font-medium text-foreground">DR {doctorName}</p>
                            <p className="text-muted-foreground">License: {doctorLicense}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Date Issued</p>
                            <p className="font-medium text-foreground">{currentDate}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Status</p>
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Patient Information */}
                    <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Patient Information</p>
                        <div className="grid grid-cols-4 gap-3 text-xs">
                            <div>
                                <p className="text-muted-foreground mb-0.5">Full Name</p>
                                <p className="font-medium text-foreground">{patient.firstName} {patient.lastName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-0.5">Age</p>
                                <p className="font-medium text-foreground">{patient.age} years</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-0.5">Gender</p>
                                <p className="font-medium text-foreground capitalize">{patient.gender}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-0.5">Patient ID</p>
                                <p className="font-medium text-foreground">{patient.patientId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Validation errors */}
                    {Object.keys(errors).length > 0 && (
                        <div className="mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-xs text-destructive">
                            <p className="font-semibold mb-1">Please fix the following:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {Object.entries(errors).map(([field, message]) => (
                                    <li key={field}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Drug Interaction Warning */}
                    {showInteractionWarning && drugInteractions.length > 0 && (
                        <div className="mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/5">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-destructive mb-1">Drug Interaction Warning</p>
                                    <div className="space-y-0.5">
                                        {drugInteractions.map((interaction, index) => (
                                            <div key={index} className="flex items-center text-xs text-destructive">
                                                <div className="w-1.5 h-1.5 bg-destructive rounded-full mr-2"></div>
                                                {interaction}
                                                </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-destructive mt-1">Please review medications carefully.</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowInteractionWarning(false)} className="text-destructive hover:bg-destructive/10 h-6 w-6 p-0 flex-shrink-0">
                                    ✕
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Main prescription form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Medication Prescription section */}
                        <div className="rounded-lg border border-border bg-card">
                            <div className="px-4 py-2.5 border-b border-border">
                                <h2 className="text-sm font-semibold text-foreground">Prescription Items (Medication / Service)</h2>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Nurse Assignment */}
                                <div className="flex flex-wrap items-center gap-4">
                                    <p className="text-xs font-medium text-muted-foreground">Global Nurse Assignment</p>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="sendAllToNurse"
                                            checked={sendAllToNurse}
                                            onChange={(e) => handleSendAllToNurse(e.target.checked)}
                                            className="rounded border-border"
                                        />
                                        Send All Medications to Nurse Dashboard
                                    </label>
                                    {sendAllToNurse && (
                                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                            <select
                                                id="globalNurseSelect"
                                                value={globalNurseId}
                                                onChange={(e) => handleGlobalNurseChange(e.target.value)}
                                                className="h-8 text-xs px-2 border border-border rounded bg-background flex-1"
                                            >
                                                <option value="">Select nurse...</option>
                                                {Array.isArray(nurses) && nurses.map(nurse => (
                                                    <option key={nurse.id} value={nurse.id}>
                                                        {nurse.firstName} {nurse.lastName}{nurse.department ? ` (${nurse.department})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.globalNurseId && <p className="text-xs text-destructive">{errors.globalNurseId}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Medications list */}
                                {medications.map((medication, index) => (
                                    <div key={index} className="rounded-md border border-border p-3 space-y-3">
                                        {/* Medication header row */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-foreground">Medication {index + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <Select onValueChange={(value) => applyMedicationTemplate(value, index)}>
                                                    <SelectTrigger className="h-7 w-28 text-xs">
                                                        <SelectValue placeholder="Quick" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[9999]">
                                                        <SelectItem value="most-subscribed" className="text-xs">Most Subscribed</SelectItem>
                                                        <SelectItem value="inventory-top" className="text-xs">From Inventory</SelectItem>
                                                        <SelectItem value="pain-relief" className="text-xs">Pain Relief</SelectItem>
                                                        <SelectItem value="antibiotic" className="text-xs">Antibiotic</SelectItem>
                                                        <SelectItem value="hypertension" className="text-xs">Hypertension</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => addMedication(index + 1)} title="Add medication">
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Medication name + type */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`medication-${index}`} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                    Medication Name <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="flex gap-1 ml-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedMedications = [...medications];
                                                            updatedMedications[index].medicationType = 'inventory';
                                                            updatedMedications[index].medication = '';
                                                            updatedMedications[index].inventoryItemId = null;
                                                            updatedMedications[index].inventoryItem = undefined;
                                                            updatedMedications[index].serviceId = null;
                                                            updatedMedications[index].service = null;
                                                            updatedMedications[index].serviceNotes = '';
                                                            setMedications(updatedMedications);
                                                        }}
                                                        className={`px-2.5 py-0.5 text-xs rounded border transition-colors ${
                                                            medication.medicationType === 'inventory'
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                                        }`}
                                                    >
                                                        Inventory
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedMedications = [...medications];
                                                            updatedMedications[index].medicationType = 'external';
                                                            updatedMedications[index].medication = '';
                                                            updatedMedications[index].inventoryItemId = null;
                                                            updatedMedications[index].inventoryItem = undefined;
                                                            updatedMedications[index].serviceId = null;
                                                            updatedMedications[index].service = null;
                                                            updatedMedications[index].serviceNotes = '';
                                                            setMedications(updatedMedications);
                                                        }}
                                                        className={`px-2.5 py-0.5 text-xs rounded border transition-colors ${
                                                            medication.medicationType === 'external'
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                                        }`}
                                                    >
                                                        External
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedMedications = [...medications];
                                                            updatedMedications[index].medicationType = 'service';
                                                            updatedMedications[index].medication = '';
                                                            updatedMedications[index].serviceId = null;
                                                            updatedMedications[index].service = null;
                                                            updatedMedications[index].serviceNotes = '';
                                                            updatedMedications[index].quantity = 1;
                                                            // Clear medication-only fields
                                                            updatedMedications[index].inventoryItemId = null;
                                                            updatedMedications[index].inventoryItem = undefined;
                                                            updatedMedications[index].dosage = '';
                                                            updatedMedications[index].frequency = '';
                                                            updatedMedications[index].duration = '';
                                                            updatedMedications[index].route = '';
                                                            updatedMedications[index].nurseInstructions = '';
                                                            updatedMedications[index].sendToNurse = false;
                                                            updatedMedications[index].assignedNurseId = null;
                                                            setMedications(updatedMedications);
                                                        }}
                                                        className={`px-2.5 py-0.5 text-xs rounded border transition-colors ${
                                                            medication.medicationType === 'service'
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                                        }`}
                                                    >
                                                        Service
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="col-span-full">

                                                {/* Inventory Medication Search */}
                                                {medication.medicationType === 'inventory' && (
                                                    <div className="space-y-2">
                                                        <Input 
                                                            id={`medication-${index}`} 
                                                            name="medication" 
                                                            value={medication.medication} 
                                                            onChange={(e) => {
                                                                handleInputChange(e, index);
                                                            }}
                                                            placeholder="Search inventory medications..."
                                                            className={`mt-0.5 flex-1 h-7 text-xs ${
                                                                errors[`medications[${index}].medication`] 
                                                                    ? 'border-destructive' 
                                                                    : medication.inventoryItem 
                                                                        ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200' 
                                                                        : ''
                                                            }`}
                                                            list={`inventory-suggestions-${index}`}
                                                        />
                                                        <datalist id={`inventory-suggestions-${index}`}>
                                                            {/* Most subscribed from inventory first */}
                                                            {getMostSubscribedFromInventory().map(item => (
                                                                <option key={`inventory-top-${item._id}`} value={item.name} label={`⭐📦 ${item.name} (Stock: ${item.quantity} ${item.unit})`} />
                                                            ))}
                                                            {/* Other inventory items */}
                                                            {availableInventoryMedications
                                                                .filter(item => !getMostSubscribedFromInventory().some(top => top._id === item._id))
                                                                .map(item => (
                                                                <option key={`inventory-${item._id}`} value={item.name} label={`📦 ${item.name} (Stock: ${item.quantity} ${item.unit})`} />
                                                            ))}
                                                        </datalist>
                                                        
                                                        {/* Inventory Quick Access */}
                                                        {getMostSubscribedFromInventory().length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                <span className="text-xs text-muted-foreground font-medium">📦 From Inventory:</span>
                                                                {getMostSubscribedFromInventory().slice(0, 4).map(item => (
                                                                    <button
                                                                        key={item._id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleInputChange({ target: { value: item.name } } as React.ChangeEvent<HTMLInputElement>, index);
                                                                            // Auto-fetch dosage and route from inventory item
                                                                            if (item.dosage || item.administrationRoute) {
                                                                                setMedications(prevMeds => {
                                                                                    const updatedMeds = [...prevMeds];
                                                                                    if (item.dosage && !updatedMeds[index].dosage) {
                                                                                        updatedMeds[index].dosage = item.dosage;
                                                                                    }
                                                                                    if (item.administrationRoute && !updatedMeds[index].route) {
                                                                                        updatedMeds[index].route = item.administrationRoute;
                                                                                    }
                                                                                    return updatedMeds;
                                                                                });
                                                                            }
                                                                            autoSuggestMedicationDefaults(item.name, index);
                                                                        }}
                                                                        className="px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded hover:bg-primary/20 transition-colors"
                                                                        title={`Stock: ${item.quantity} ${item.unit}`}
                                                                    >
                                                                        {item.name} ({item.quantity})
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* External Medication Search */}
                                                {medication.medicationType === 'external' && (
                                                    <div className="space-y-2">
                                                        <Input 
                                                            id={`medication-${index}`} 
                                                            name="medication" 
                                                            value={medication.medication} 
                                                            onChange={(e) => {
                                                                handleInputChange(e, index);
                                                                // Auto-suggest defaults only when exact medication is selected
                                                                const selectedMed = e.target.value;
                                                                if (selectedMed && (COMMON_MEDICATIONS.includes(selectedMed) || MEDICATION_DOSAGES[selectedMed])) {
                                                                    autoSuggestMedicationDefaults(selectedMed, index);
                                                                }
                                                                // flag as new external entry if not known
                                                                const allKnown = new Set([
                                                                    ...MOST_SUBSCRIBED_MEDICATIONS,
                                                                    ...COMMON_MEDICATIONS,
                                                                    ...savedExternalMeds
                                                                ]);
                                                                setIsNewExternalAtIndex(prev => ({
                                                                    ...prev,
                                                                    [index]: !!selectedMed && !allKnown.has(selectedMed)
                                                                }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const name = e.target.value?.trim();
                                                                if (!name) return;
                                                                const allKnown = new Set([
                                                                    ...MOST_SUBSCRIBED_MEDICATIONS,
                                                                    ...COMMON_MEDICATIONS,
                                                                    ...savedExternalMeds
                                                                ]);
                                                                if (!allKnown.has(name)) {
                                                                    const next = Array.from(new Set([name, ...savedExternalMeds])).slice(0, 200);
                                                                    setSavedExternalMeds(next);
                                                                    localStorage.setItem(SAVED_EXTERNAL_MEDS_KEY, JSON.stringify(next));
                                                                    toast.success('Saved external medication for future use');
                                                                    setIsNewExternalAtIndex(prev => ({ ...prev, [index]: false }));
                                                                }
                                                            }}
                                                            placeholder="Enter external medication name"
                                                            className={`mt-0.5 flex-1 h-7 text-xs ${
                                                                errors[`medications[${index}].medication`] 
                                                                    ? 'border-destructive' 
                                                                    : ''
                                                            }`}
                                                            list={`external-suggestions-${index}`}
                                                        />
                                                        <datalist id={`external-suggestions-${index}`}>
                                                            {/* Recently saved external entries */}
                                                            {savedExternalMeds.map(med => (
                                                                <option key={`saved-${med}`} value={med} label={`📝 ${med} (Saved)`} />
                                                            ))}
                                                            {/* Most subscribed external medications */}
                                                            {MOST_SUBSCRIBED_MEDICATIONS.map(med => (
                                                                <option key={`most-subscribed-${med}`} value={med} label={`⭐💊 ${med} (External)`} />
                                                            ))}
                                                            {/* Other common medications */}
                                                            {COMMON_MEDICATIONS
                                                                .filter(med => !MOST_SUBSCRIBED_MEDICATIONS.includes(med))
                                                                .map(med => (
                                                                <option key={`common-${med}`} value={med} label={`💊 ${med} (External)`} />
                                                            ))}
                                                        </datalist>
                                                        {isNewExternalAtIndex[index] && (
                                                            <div className="text-[11px] text-blue-600">
                                                                ✨ New entry — will be saved for future use
                                                            </div>
                                                        )}
                                                        
                                                        {/* External Quick Access */}
                                                        <div className="flex flex-wrap gap-1">
                                                            <span className="text-xs text-muted-foreground font-medium">⭐ Most Subscribed:</span>
                                                            {MOST_SUBSCRIBED_MEDICATIONS.slice(0, 4).map(med => (
                                                                <button
                                                                    key={med}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleInputChange({ target: { value: med } } as React.ChangeEvent<HTMLInputElement>, index);
                                                                        autoSuggestMedicationDefaults(med, index);
                                                                    }}
                                                                    className="px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded hover:bg-primary/20 transition-colors"
                                                                >
                                                                    {med}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Clinic Service Search */}
                                                {medication.medicationType === 'service' && (
                                                    <div className="space-y-2">
                                                        <Input
                                                            id={`service-${index}`}
                                                            name="medication"
                                                            value={medication.medication}
                                                            onChange={(e) => {
                                                                handleInputChange(e, index);
                                                            }}
                                                            placeholder="Search clinic services..."
                                                            className={`mt-0.5 flex-1 h-7 text-xs ${
                                                                errors[`medications[${index}].medication`] || errors[`medications[${index}].serviceId`]
                                                                    ? 'border-destructive'
                                                                    : medication.service
                                                                        ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200'
                                                                        : ''
                                                            }`}
                                                            list={`service-suggestions-${index}`}
                                                        />
                                                        <datalist id={`service-suggestions-${index}`}>
                                                            {availableServices.map((svc) => (
                                                                <option
                                                                    key={`svc-${svc._id}`}
                                                                    value={svc.name}
                                                                    label={`🩺 ${svc.name} (${svc.category}) - ETB ${svc.price}`}
                                                                />
                                                            ))}
                                                        </datalist>

                                                        {medication.service && (
                                                            <div className="text-xs text-emerald-700 flex flex-wrap items-center gap-2">
                                                                <span className="font-medium">ETB {Number((medication.service as any).price || 0).toFixed(2)}</span>
                                                                <span className="text-muted-foreground">• {medication.service.category}</span>
                                                                {(medication.service as any).inventoryStatus?.linked && (
                                                                    <span className="text-muted-foreground">
                                                                        • Inventory linked: {(medication.service as any).inventoryStatus.inventoryItemName} ({(medication.service as any).inventoryStatus.quantity})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {!medication.service && medication.medication?.trim() && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Not found in clinic services list — please pick an existing service.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {medication.medicationType === 'inventory' && medication.inventoryItem && (
                                                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                                        <Package className="w-3 h-3" /> Available in inventory — dispensed at reception
                                                    </p>
                                                )}
                                                {medication.medicationType === 'external' && medication.medication && (
                                                    <p className="text-xs text-muted-foreground">External — printed for patient to purchase elsewhere</p>
                                                )}
                                                {errors[`medications[${index}].medication`] && (
                                                    <p className="text-xs text-destructive">{errors[`medications[${index}].medication`]}</p>
                                                )}
                                                {errors[`medications[${index}].serviceId`] && (
                                                    <p className="text-xs text-destructive">{errors[`medications[${index}].serviceId`]}</p>
                                                )}
                            </div>
                        </div>

                                        {medication.medicationType === 'service' ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs font-medium text-muted-foreground block mb-1">Quantity <span className="text-destructive">*</span></Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={medication.quantity || 1}
                                                        onChange={(e) => {
                                                            const updatedMeds = [...medications];
                                                            updatedMeds[index] = { ...updatedMeds[index], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                                                            setMedications(updatedMeds);
                                                        }}
                                                        className={`h-8 text-xs ${errors[`medications[${index}].quantity`] ? 'border-destructive' : ''}`}
                                                    />
                                                    {errors[`medications[${index}].quantity`] && <p className="text-xs text-destructive mt-0.5">{errors[`medications[${index}].quantity`]}</p>}
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs font-medium text-muted-foreground block mb-1">Service Notes</Label>
                                                    <Textarea
                                                        name="serviceNotes"
                                                        value={medication.serviceNotes || ''}
                                                        onChange={(e) => handleInputChange(e, index)}
                                                        placeholder="Any clinical notes for this service..."
                                                        className="resize-none h-14 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Fields grid: Dosage, Frequency, Duration, Route */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Dosage */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Label className="text-xs font-medium text-muted-foreground">Dosage <span className="text-destructive">*</span></Label>
                                                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCustomDosage({...customDosage, [index]: !customDosage[index]})}>
                                                                {customDosage[index] ? 'List' : 'Custom'}
                                                            </button>
                                                        </div>
                                                        {!customDosage[index] ? (
                                                            <Select onValueChange={(value) => handleSelectChange('dosage', value, index)} value={medication.dosage || ''} disabled={!medication.medication} key={`dosage-${index}-${medication.dosage}`}>
                                                                <SelectTrigger className={`h-8 text-xs ${errors[`medications[${index}].dosage`] ? 'border-destructive' : ''}`}>
                                                                    <SelectValue placeholder={medication.medication ? "Select dosage" : "Select medication first"} />
                                                                </SelectTrigger>
                                                                <SelectContent className="z-[9999]">
                                                                    {medication.medication ? (
                                                                        <>
                                                                            {medication.inventoryItem?.dosage && <SelectItem value={medication.inventoryItem.dosage}>{medication.inventoryItem.dosage} (Inventory)</SelectItem>}
                                                                            {MEDICATION_DOSAGES[medication.medication]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                                            {savedCustomDosages.map(d => <SelectItem key={`saved-${d}`} value={d}>{d} (Saved)</SelectItem>)}
                                                                            {!MEDICATION_DOSAGES[medication.medication] && !medication.inventoryItem?.dosage && (
                                                                                <>
                                                                                    <SelectItem value="As directed">As directed</SelectItem>
                                                                                    <SelectItem value="2.5ml">2.5ml</SelectItem>
                                                                                    <SelectItem value="5ml">5ml</SelectItem>
                                                                                    <SelectItem value="10ml">10ml</SelectItem>
                                                                                    <SelectItem value="15ml">15ml</SelectItem>
                                                                                    <SelectItem value="1 tablet">1 tablet</SelectItem>
                                                                                    <SelectItem value="2 tablets">2 tablets</SelectItem>
                                                                                    <SelectItem value="1/2 tablet">1/2 tablet</SelectItem>
                                                                                    <SelectItem value="1 capsule">1 capsule</SelectItem>
                                                                                    <SelectItem value="500mg">500mg</SelectItem>
                                                                                    <SelectItem value="250mg">250mg</SelectItem>
                                                                                    <SelectItem value="100mg">100mg</SelectItem>
                                                                                    <SelectItem value="50mg">50mg</SelectItem>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    ) : <SelectItem value="none" disabled>Select a medication first</SelectItem>}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input value={medication.dosage} onChange={(e) => handleInputChange(e, index)} onBlur={() => { if (medication.dosage?.trim()) saveCustomDosageForNextTime(medication.dosage.trim()); }} name="dosage" placeholder="e.g. 500mg, 5ml" className={`h-8 text-xs ${errors[`medications[${index}].dosage`] ? 'border-destructive' : ''}`} />
                                                        )}
                                                        {errors[`medications[${index}].dosage`] && <p className="text-xs text-destructive mt-0.5">{errors[`medications[${index}].dosage`]}</p>}
                                                    </div>

                                                    {/* Frequency */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-muted-foreground block mb-1">Frequency <span className="text-destructive">*</span></Label>
                                                        <select value={medication.frequency || ''} onChange={(e) => handleSelectChange('frequency', e.target.value, index)} className={`w-full h-8 text-xs px-2 border rounded bg-background ${errors[`medications[${index}].frequency`] ? 'border-destructive' : 'border-border'}`}>
                                                            <option value="">Select frequency</option>
                                                            <optgroup label="Common">
                                                                {MOST_SUBSCRIBED_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                            </optgroup>
                                                            <optgroup label="All">
                                                                {ENHANCED_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                            </optgroup>
                                                        </select>
                                                        {errors[`medications[${index}].frequency`] && <p className="text-xs text-destructive mt-0.5">{errors[`medications[${index}].frequency`]}</p>}
                                                    </div>

                                                    {/* Duration */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Label className="text-xs font-medium text-muted-foreground">Duration <span className="text-destructive">*</span></Label>
                                                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCustomDuration({...customDuration, [`med-${index}`]: !customDuration[`med-${index}`]})}>
                                                                {customDuration[`med-${index}`] ? 'List' : 'Custom'}
                                                            </button>
                                                        </div>
                                                        {!customDuration[`med-${index}`] ? (
                                                            <select value={medication.duration || ''} onChange={(e) => handleSelectChange('duration', e.target.value, index)} className={`w-full h-8 text-xs px-2 border rounded bg-background ${errors[`medications[${index}].duration`] ? 'border-destructive' : 'border-border'}`}>
                                                                <option value="">Select duration</option>
                                                                <optgroup label="Common">
                                                                    {MOST_SUBSCRIBED_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </optgroup>
                                                                <optgroup label="All">
                                                                    {COMMON_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </optgroup>
                                                            </select>
                                                        ) : (
                                                            <Input name="duration" value={medication.duration || ''} onChange={(e) => handleInputChange(e, index)} placeholder="e.g. 7 days, 2 weeks" className={`h-8 text-xs ${errors[`medications[${index}].duration`] ? 'border-destructive' : ''}`} />
                                                        )}
                                                        {errors[`medications[${index}].duration`] && <p className="text-xs text-destructive mt-0.5">{errors[`medications[${index}].duration`]}</p>}
                                                    </div>

                                                    {/* Route */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-muted-foreground block mb-1">Route</Label>
                                                        <select value={medication.route || ''} onChange={(e) => handleSelectChange('route', e.target.value, index)} className="w-full h-8 text-xs px-2 border border-border rounded bg-background">
                                                            <option value="">Select route</option>
                                                            <optgroup label="Common">
                                                                {MOST_SUBSCRIBED_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                                            </optgroup>
                                                            <optgroup label="All">
                                                                {MEDICATION_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                                            </optgroup>
                                                            {medication.inventoryItem?.administrationRoute && !MEDICATION_ROUTES.includes(medication.inventoryItem.administrationRoute) && (
                                                                <option value={medication.inventoryItem.administrationRoute}>{medication.inventoryItem.administrationRoute} (Inventory)</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Quantity (inventory only) */}
                                                {medication.inventoryItem && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Label className="text-xs font-medium text-muted-foreground">Quantity to Dispense</Label>
                                                                <button type="button" className="text-xs text-primary hover:underline" onClick={() => {
                                                                    const qty = calculateQuantity(medication.frequency || "Once daily (QD)", medication.duration || "7 days");
                                                                    const updatedMeds = [...medications];
                                                                    updatedMeds[index] = { ...updatedMeds[index], quantity: qty };
                                                                    setMedications(updatedMeds);
                                                                }}>Auto-calc</button>
                                                            </div>
                                                            <Input type="number" min="1" max={medication.inventoryItem.quantity} value={medication.quantity || ''} onChange={(e) => { const updatedMeds = [...medications]; updatedMeds[index] = { ...updatedMeds[index], quantity: parseInt(e.target.value) || 0 }; setMedications(updatedMeds); }} placeholder="Quantity" className="h-8 text-xs" />
                                                            {medication.frequency && medication.duration && <p className="text-xs text-muted-foreground mt-0.5">{medication.frequency} × {medication.duration} = {calculateQuantity(medication.frequency, medication.duration)} doses</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Special Instructions */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Label className="text-xs font-medium text-muted-foreground">Special Instructions</Label>
                                                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCustomSpecialInstructions({...customSpecialInstructions, [index]: !customSpecialInstructions[index]})}>
                                                            {customSpecialInstructions[index] ? 'List' : 'Custom'}
                                                        </button>
                                                    </div>
                                                    {!customSpecialInstructions[index] ? (
                                                        <Select onValueChange={(value) => handleSelectChange('nurseInstructions', value, index)} value={medication.nurseInstructions || ''} key={`si-${index}-${medication.nurseInstructions}`}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select special instructions" /></SelectTrigger>
                                                            <SelectContent className="z-[9999]">
                                                                {COMMON_SPECIAL_INSTRUCTIONS.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Textarea name="nurseInstructions" value={medication.nurseInstructions} onChange={(e) => handleInputChange(e, index)} placeholder="e.g. Take with food, avoid alcohol" className="resize-none h-14 text-xs" />
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Remove button */}
                                        {medications.length > 1 && (
                                            <div className="flex justify-end">
                                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7 text-xs" onClick={() => removeMedication(index)}>
                                                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        



                        {/* Form Actions */}
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-muted-foreground">Shortcuts: Ctrl+M: Add medication &nbsp;·&nbsp; Ctrl+Enter: Submit &nbsp;·&nbsp; Ctrl+P: Print &nbsp;·&nbsp; Esc: Close</p>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-5 text-sm font-medium">
                                {isSubmitting ? 'Creating...' : 'Create Prescription'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalPrescriptionForm; 

// Extension modal component removed - simplified prescription system